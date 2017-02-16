'use strict';

export async function transformSVG({ content, ...opts }) { // eslint-disable-line
  // TODO: Analyse URLs inside SVG to discover new linked files
  // Ex.: <svg><image href="url" /></svg>
  return content;
}
