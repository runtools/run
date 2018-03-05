/* global Raven */

import React from 'react';
import ReactDOM from 'react-dom';

import constants from './constants';
import App from './components/app';

const SENTRY_DSN = 'https://6a53d9cf58314fd695c815443c482b2a@sentry.io/298103';

if (constants.STAGE === 'production') {
  Raven.config(SENTRY_DSN, {release: constants.VERSION, environment: constants.STAGE}).install();
}

ReactDOM.render(<App />, document.getElementById('app'));
