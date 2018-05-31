import React from 'react';
import PropTypes from 'prop-types';
import RadiumStarter from 'radium-starter';

import Layout from './layout';

export class Sorry extends React.Component {
  static propTypes = {
    message: PropTypes.node.isRequired,
    info: PropTypes.node
  };

  render() {
    return (
      <RadiumStarter>
        {(t, s) => {
          const {message, info} = this.props;

          return (
            <Layout
              style={{justifyContent: 'center', alignItems: 'center', padding: '1.5rem 1.5rem'}}
            >
              <h1>Sorry! 🙇</h1>
              <h3 style={{...s.subheading, maxWidth: '600px', textAlign: 'center'}}>{message}</h3>
              {info ? (
                <p
                  style={{
                    ...s.border,
                    ...s.rounded,
                    maxWidth: '600px',
                    marginTop: '1.5rem',
                    padding: '1rem',
                    color: t.mutedTextColor
                  }}
                >
                  {info}
                </p>
              ) : null}
            </Layout>
          );
        }}
      </RadiumStarter>
    );
  }
}

export default Sorry;
