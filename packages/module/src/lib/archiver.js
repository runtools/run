'use strict';

import archiver from 'archiver';
import streamBuffers from 'stream-buffers';

export function zipFiles(files) {
  return new Promise((resolve, reject) => {
    const output = new streamBuffers.WritableStreamBuffer();
    output.on('finish', function() {
      resolve(output.getContents());
    });

    const archive = archiver('zip');

    archive.on('error', function(err) {
      reject(err);
    });

    archive.pipe(output);

    for (const file of files) {
      archive.append(file.data, { name: file.name });
    }

    archive.finalize();
  });
}
