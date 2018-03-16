import React from 'react';
import PropTypes from 'prop-types';
import {withRadiumStarter} from 'radium-starter';

@withRadiumStarter
export class Banner extends React.Component {
  static propTypes = {
    theme: PropTypes.object.isRequired,
    styles: PropTypes.object.isRequired
  };

  render() {
    const {theme: t} = this.props;

    return (
      <div style={{padding: '.5rem', background: t.altBackgroundColor, textAlign: 'center'}}>
        Ooh, my! Run is{' '}
        <a href="https://www.producthunt.com/posts/run-3" target="_blank" rel="noreferrer noopener">
          featured on Product Hunt
        </a>{' '}
        today! 🎉
      </div>
    );
  }
}

export default Banner;
