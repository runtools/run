'use strict';

import semver from 'semver';

export function generateDeploymentName({ name, version, stage }) {
  version = createCompatibleVersionRange(version).replace(/\./g, '-');
  return `${name}-${version}-${stage}`;
}

function createCompatibleVersionRange(version) {
  const major = semver.major(version);
  if (major >= 1) {
    return `${major}.x.x`;
  } else {
    const minor = semver.minor(version);
    return `${major}.${minor}.x`;
  }
}
