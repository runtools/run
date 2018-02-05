import React from 'react';
import PropTypes from 'prop-types';

const RUN_LOGO_PATH = '/images/run-logo-dark-mode-v1.immutable.svg'; // WARNING: this path is repeated in index.html
const ASPECT_RATIO = 0.387210174873847; // WARNING: this should be changed according to the image

export class Logo extends React.Component {
  static propTypes = {
    width: PropTypes.number.isRequired,
    style: PropTypes.object
  };

  render() {
    return (
      <img
        src={RUN_LOGO_PATH}
        alt="Run"
        style={{
          width: this.props.width + 'px',
          height: this.props.width * ASPECT_RATIO + 'px',
          ...this.props.style
        }}
      />
    );
  }
}

export default Logo;
