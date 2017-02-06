'use strict';

import { format } from './console';

export function createUserError(message) {
  const err = new Error(message);
  err.userError = true;
  return err;
}

export function showError(error) {
  if (typeof error === 'string') {
    error = createUserError(error);
  }
  if (error.userError) {
    console.error(format({ status: 'error', message: error.message }));
  } else {
    console.error(error);
  }
}

export function showErrorAndExit(error, code = 1) {
  showError(error);
  process.exit(code);
}
