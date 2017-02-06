'use strict';

import archiver from 'archiver';
import streamBuffers from 'stream-buffers';

export function zip({ name, data }) {
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
    archive.append(data, { name });
    archive.finalize();
  });
}
