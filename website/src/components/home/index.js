import React from 'react';
import PropTypes from 'prop-types';
import {withRadiumStarter} from 'radium-starter';

import Header from '../header';
import Hero from './hero';
import Intro from './intro';
import Demo from './demo';
import Action from './action';
import Footer from '../footer';
import Link from '../link';
import FullHeight from '../full-height';
import withErrorBoundary from '../error-boundary';

@withErrorBoundary
@withRadiumStarter
export class Home extends React.Component {
  static propTypes = {
    theme: PropTypes.object.isRequired,
    styles: PropTypes.object.isRequired
  };

  render() {
    const {theme: t, styles: s} = this.props;

    return (
      <div>
        <FullHeight style={{backgroundColor: t.heroBackgroundColor}}>
          <div style={{padding: '.5rem', background: t.altBackgroundColor, textAlign: 'center'}}>
            Ooh, my! Run is{' '}
            <a
              href="https://www.producthunt.com/posts/run-3"
              target="_blank"
              rel="noreferrer noopener"
            >
              featured on Product Hunt
            </a>{' '}
            today! 🎉
          </div>
          <Header linkStyle={s.heroLink} />
          <Hero style={{flexGrow: 1}} />
          <div style={{...s.minimumLineHeight, alignSelf: 'center', padding: '1.5rem 0'}}>
            <Link to="/#intro" style={{color: t.baseTextColor, ':hover': {textDecoration: 'none'}}}>
              ▼
            </Link>
          </div>
        </FullHeight>
        <div style={s.centeredPage}>
          <Intro />
          <hr style={{marginTop: 0, marginBottom: 0}} />
          <Demo />
          <hr style={{marginTop: 0, marginBottom: 0}} />
          <Action />
        </div>
        <Footer />
      </div>
    );
  }
}

export default Home;
