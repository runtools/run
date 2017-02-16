'use strict';

export async function transformCSS({ content, ...opts }) { // eslint-disable-line
  // TODO: Analyse URLs inside styles to discover new linked files
  return content;
}
