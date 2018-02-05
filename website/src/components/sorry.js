import React from 'react';
import PropTypes from 'prop-types';
import {withRadiumStarter} from 'radium-starter';

import Layout from './layout';

@withRadiumStarter
export class Sorry extends React.Component {
  static propTypes = {
    message: PropTypes.string.isRequired,
    styles: PropTypes.object.isRequired
  };

  render() {
    const {message, styles: s} = this.props;

    return (
      <Layout style={{justifyContent: 'center', alignItems: 'center', padding: '1.5rem 1.5rem'}}>
        <h1>Sorry! 🙇</h1>
        <h3 style={{...s.subheading, maxWidth: '600px', textAlign: 'center'}}>{message}</h3>
      </Layout>
    );
  }
}

export default Sorry;
