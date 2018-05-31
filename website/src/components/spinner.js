import React from 'react';
import PropTypes from 'prop-types';
import RadiumStarter from 'radium-starter';
import MDSpinner from 'react-md-spinner';

const DELAY = 500;

class Spinner extends React.Component {
  static propTypes = {
    size: PropTypes.number
  };

  state = {
    isVisible: false
  };

  componentDidMount() {
    this.timeoutId = setTimeout(() => {
      this.setState({isVisible: true});
    }, DELAY);
  }

  componentWillUnmount() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  render() {
    return (
      <RadiumStarter>
        {t => {
          const {size} = this.props;

          if (!this.state.isVisible) {
            return false;
          }

          return (
            <MDSpinner
              size={size}
              color1={t.primaryColor}
              color2={t.accentColor}
              color3={t.extraColor1}
              color4={t.extraColor2}
            />
          );
        }}
      </RadiumStarter>
    );
  }
}

export default Spinner;
