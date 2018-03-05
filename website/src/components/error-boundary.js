/* global Raven */

import React from 'react';

import Sorry from './sorry';
import constants from '../constants';

export function withErrorBoundary(WrappedComponent) {
  return class ErrorBoundary extends React.Component {
    state = {
      caughtError: undefined
    };

    componentWillReceiveProps() {
      this.setState({caughtError: undefined});
    }

    componentDidCatch(error, _info) {
      this.setState({caughtError: error});
      if (constants.STAGE === 'production') {
        Raven.captureException(error);
      }
    }

    render() {
      const {caughtError} = this.state;
      if (caughtError) {
        const info = (
          <span>
            {caughtError.message}
            <br />
            <small>{window.navigator.userAgent}</small>
          </span>
        );
        return <Sorry message="I'm afraid something went wrong." info={info} />;
      }
      return <WrappedComponent {...this.props} />;
    }
  };
}

export function catchErrors(target, name, descriptor) {
  const original = descriptor.value;
  descriptor.value = async function (...args) {
    try {
      return await original.apply(this, args);
    } catch (err) {
      this.setState(() => {
        throw err;
      });
    }
  };
}

export default withErrorBoundary;
