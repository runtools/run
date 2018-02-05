import React from 'react';
import PropTypes from 'prop-types';

import Header from './header';
import Footer from './footer';
import FullHeight from './full-height';

export class Layout extends React.Component {
  static propTypes = {
    style: PropTypes.object,
    children: PropTypes.node.isRequired
  };

  render() {
    return (
      <FullHeight>
        <Header />
        <div style={{flexGrow: 1, display: 'flex', flexDirection: 'column', ...this.props.style}}>
          {this.props.children}
        </div>
        <Footer />
      </FullHeight>
    );
  }
}

export default Layout;
