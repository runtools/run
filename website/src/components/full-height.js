import React from 'react';
import PropTypes from 'prop-types';

export class FullHeight extends React.Component {
  static propTypes = {
    style: PropTypes.object,
    children: PropTypes.node.isRequired
  };

  render() {
    // Use IE11 fix: https://codepen.io/chriswrightdesign/pen/emQNGZ/
    return (
      <div style={{display: 'flex'}}>
        <div
          style={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            ...this.props.style
          }}
        >
          {this.props.children}
        </div>
      </div>
    );
  }
}

export default FullHeight;
