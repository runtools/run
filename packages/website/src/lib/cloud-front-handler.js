'use strict';

import { basename } from 'path';
import CloudFront from 'aws-sdk/clients/cloudfront';
import { generateDeploymentName } from '@voila/common';

export async function createOrUpdateCloudFrontDistribution(opts) {
  const cloudFront = new CloudFront({ ...opts.awsConfig, apiVersion: '2016-11-25' });

  const deploymentName = generateDeploymentName(opts);

  const params = {
    DistributionConfig: {
      CallerReference: deploymentName,
      Comment: '',
      Enabled: true,
      Origins: {
        Quantity: 1,
        Items: [{
          DomainName: opts.origin,
          Id: deploymentName,
          CustomOriginConfig: {
            HTTPPort: 80,
            HTTPSPort: 443,
            OriginProtocolPolicy: 'http-only'
          }
        }]
      },
      DefaultCacheBehavior: {
        TargetOriginId: deploymentName,
        ForwardedValues: {
          QueryString: false,
          Cookies: { Forward: 'none' }
        },
        ViewerProtocolPolicy: 'redirect-to-https',
        TrustedSigners: {
          Enabled: false,
          Quantity: 0
        },
        MinTTL: 0 // TODO: try to optimize this
      },
      PriceClass: 'PriceClass_All'
    }
  };

  if (opts.spa) {
    params.DistributionConfig.CustomErrorResponses = {
      Quantity: 1,
      Items: [{
        ErrorCode: 404,
        ResponseCode: '200',
        ResponsePagePath: '/' + basename(opts.entryFile)
      }]
    };
  }

  const result = await cloudFront.createDistribution(params).promise();

  const cloudFrontDomainName = result.Distribution.DomainName;

  console.log(cloudFrontDomainName);
}
