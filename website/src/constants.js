/* eslint-disable no-template-curly-in-string */

export const constants = {
  VERSION: '0.1.0',
  STAGE: '${STAGE}',
  RESDIR_WEBSITE_URL: '${RESDIR_WEBSITE_URL}',
  GOOGLE_ANALYTICS_TRACKING_ID: '${GOOGLE_ANALYTICS_TRACKING_ID}'
};

export function resolveConstants(text) {
  for (const key of Object.keys(constants)) {
    const value = constants[key];
    text = text.replace(new RegExp('\\${' + key + '}', 'g'), value);
  }
  return text;
}

export default constants;
