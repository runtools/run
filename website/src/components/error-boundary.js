/* global Raven */

import React from 'react';

import Sorry from './sorry';

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
      Raven.captureException(error);
    }

    render() {
      const {caughtError} = this.state;
      if (caughtError) {
        return <Sorry message="I'm afraid something went wrong." info={caughtError.message} />;
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
