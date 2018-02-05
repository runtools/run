import React from 'react';
import PropTypes from 'prop-types';
import {withRadiumStarter} from 'radium-starter';

import Layout from './layout';
import withErrorBoundary from './error-boundary';

@withErrorBoundary
@withRadiumStarter
export class Contact extends React.Component {
  static propTypes = {
    styles: PropTypes.object.isRequired
  };

  render() {
    const {styles: s} = this.props;

    return (
      <Layout style={{justifyContent: 'center', alignItems: 'center'}}>
        <h3 style={{...s.subheading}}>You can reach us here:</h3>
        <h1>
          <a href="mailto:hello@run.tools" target="_blank" rel="noopener noreferrer">
            hello@run.tools
          </a>
        </h1>
      </Layout>
    );
  }
}

export default Contact;
