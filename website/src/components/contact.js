import React from 'react';
import RadiumStarter from 'radium-starter';

import Layout from './layout';
import withErrorBoundary from './error-boundary';

@withErrorBoundary
export class Contact extends React.Component {
  render() {
    return (
      <RadiumStarter>
        {(_t, s) => {
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
        }}
      </RadiumStarter>
    );
  }
}

export default Contact;
