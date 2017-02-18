'use strict';

import { relative, basename } from 'path';
import { statSync, createReadStream } from 'fs';
import isEqual from 'lodash.isequal';
import denodeify from 'denodeify';
import recursiveReadDir from 'recursive-readdir';
const recursiveReadDirPromise = denodeify(recursiveReadDir);
import S3 from 'aws-sdk/clients/s3';
import STS from 'aws-sdk/clients/sts';
import mime from 'mime-types';
import hasha from 'hasha';
import bytes from 'bytes';
import { generateDeploymentName, generateHash, formatMessage, task, createUserError } from '@voila/common';

const BUCKET_NAME_MAX_LENGTH = 63;

export async function synchronize(opts) {
  const s3 = new S3({ ...opts.awsConfig, apiVersion: '2006-03-01' });

  const message = formatMessage({ ...opts, message: 'Synchronizing files...' });
  const successMessage = formatMessage({ ...opts, message: 'Files synchronized' });
  await task(message, successMessage, async (currentTask) => {
    const bucketName = await generateBucketName(opts);

    const inputFiles = await recursiveReadDirPromise(opts.inputDir);

    currentTask.setMessage(
      formatMessage({ ...opts, message: 'Listing existing files on S3...' })
    );

    const result = await s3.listObjectsV2({ Bucket: bucketName }).promise();

    if (result.IsTruncated) {
      throw createUserError('Wow, you have a lot of files on S3!', 'I am sorry but I cannot list all. Please post an issue on Voilà\'s GitHub if you really need to handle so many files.');
    }

    const existingFiles = result.Contents.map(item => {
      let md5 = item.ETag;
      md5 = md5.slice(1);
      md5 = md5.slice(0, -1);
      return { path: item.Key, md5, size: item.Size };
    });

    currentTask.setMessage(
      formatMessage({ ...opts, message: 'Synchronizing files...' })
    );

    let addedFiles = 0;
    let updatedFiles = 0;
    let removedFiles = 0;

    for (const inputFile of inputFiles) {
      const path = relative(opts.inputDir, inputFile);
      const md5 = await hasha.fromFile(inputFile, { algorithm: 'md5' });
      const size = statSync(inputFile).size;

      let existingFile;
      const index = existingFiles.findIndex(file => file.path === path);
      if (index !== -1) {
        existingFile = existingFiles[index];
        existingFiles.splice(index, 1);
      }

      if (existingFile && existingFile.size === size && existingFile.md5 === md5) {
        continue; // File already presents in S3
      }

      currentTask.setMessage(formatMessage({
        ...opts, message: `Uploading ${path}...`, info: bytes(size)
      }));

      const contentMD5 = new Buffer(md5, 'hex').toString('base64');
      const mimeType = mime.lookup(path) || 'application/octet-stream';
      const stream = createReadStream(inputFile);
      await s3.putObject({
        Bucket: bucketName,
        Key: path,
        ACL: 'public-read',
        Body: stream,
        ContentType: mimeType,
        ContentMD5: contentMD5
      }).promise();

      if (!existingFile) {
        addedFiles++;
      } else {
        updatedFiles++;
      }
    }

    for (const file of existingFiles) {
      currentTask.setMessage(formatMessage({
        ...opts, message: `Removing ${file.path}...`
      }));
      await s3.deleteObject({ Bucket: bucketName, Key: file.path }).promise();
      removedFiles++;
    }

    let info = '';
    if (addedFiles) {
      info += addedFiles + ' file';
      if (addedFiles > 1) info += 's';
      info += ' added';
    }
    if (updatedFiles) {
      if (info) info += ', ';
      info += updatedFiles + ' file';
      if (updatedFiles > 1) info += 's';
      info += ' updated';
    }
    if (removedFiles) {
      if (info) info += ', ';
      info += removedFiles + ' file';
      if (removedFiles > 1) info += 's';
      info += ' removed';
    }
    if (!info) {
      info = 'no change';
    }
    currentTask.setSuccessMessage(
      formatMessage({ ...opts, message: 'Files synchronized', info })
    );
  });
}

export async function createOrUpdateBucket(opts) {
  const s3 = new S3({ ...opts.awsConfig, apiVersion: '2006-03-01' });

  const message = formatMessage({ ...opts, message: 'Checking S3 bucket...' });
  const successMessage = formatMessage({ ...opts, message: 'S3 bucket checked' });
  await task(message, successMessage, async (currentTask) => {
    const bucketName = await generateBucketName(opts);

    let hasBeenCreated;
    let currentWebsiteConfiguration;

    try {
      await s3.createBucket({
        Bucket: bucketName
      }).promise();
      hasBeenCreated = true;
    } catch (err) {
      if (err.code !== 'BucketAlreadyOwnedByYou') throw err;
      try {
        const result = await s3.getBucketWebsite({ Bucket: bucketName }).promise();
        currentWebsiteConfiguration = { IndexDocument: result.IndexDocument };
        if (result.ErrorDocument) {
          currentWebsiteConfiguration.ErrorDocument = result.ErrorDocument;
        }
      } catch (err) {
        if (err.code !== 'NoSuchWebsiteConfiguration') throw err;
      }
    }

    const indexDocument = basename(opts.entryFile);
    const websiteConfiguration = { IndexDocument: { Suffix: indexDocument } };
    if (opts.spa) websiteConfiguration.ErrorDocument = { Key: indexDocument };

    if (isEqual(currentWebsiteConfiguration, websiteConfiguration)) return;

    await s3.putBucketWebsite({
      Bucket: bucketName,
      WebsiteConfiguration: websiteConfiguration
    }).promise();

    currentTask.setSuccessMessage(
      formatMessage({ ...opts, message: `S3 bucket ${hasBeenCreated ? 'created' : 'updated'}` })
    );
  });
}


async function generateBucketName({ name, version, stage, awsConfig }) {
  const accountId = await getAWSAccountId(awsConfig);

  let longName = accountId;
  longName += '-' + generateDeploymentName({ name, version, stage });
  longName += '-' + awsConfig.region;

  const key = generateHash(longName, 'sha1').substr(0, 8);

  const bucketName = generateDeploymentName({
    name, version, stage, key, maxLength: BUCKET_NAME_MAX_LENGTH
  });

  return bucketName;
}

const cachedAWSAccountIds = {};
async function getAWSAccountId(awsConfig) {
  let accountId = cachedAWSAccountIds[awsConfig.accessKeyId];
  if (!accountId) {
    const sts = new STS({ ...awsConfig, apiVersion: '2011-06-15' });
    const result = await sts.getCallerIdentity().promise();
    accountId = result.Account;
    cachedAWSAccountIds[awsConfig.accessKeyId] = accountId;
  }
  return accountId;
}
