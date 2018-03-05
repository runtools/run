/* global Raven */

import React from 'react';
import ReactDOM from 'react-dom';

import constants from './constants';
import App from './components/app';

const SENTRY_DSN = 'https://6a53d9cf58314fd695c815443c482b2a@sentry.io/298103';

Raven.config(SENTRY_DSN, {release: constants.VERSION, environment: constants.STAGE}).install();

Raven.context(() => {
  ReactDOM.render(<App />, document.getElementById('app'));
});
