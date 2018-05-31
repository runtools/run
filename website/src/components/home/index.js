import React from 'react';
import RadiumStarter from 'radium-starter';

import Header from '../header';
import Hero from './hero';
import Intro from './intro';
import Demo from './demo';
import Banner from './banner';
import Action from './action';
import Footer from '../footer';
import Link from '../link';
import FullHeight from '../full-height';
import withErrorBoundary from '../error-boundary';

@withErrorBoundary
export class Home extends React.Component {
  render() {
    return (
      <RadiumStarter>
        {(t, s) => {
          return (
            <div>
              <FullHeight style={{backgroundColor: t.heroBackgroundColor}}>
                {false && <Banner />}
                <Header linkStyle={s.heroLink} />
                <Hero style={{flexGrow: 1}} />
                <div style={{...s.minimumLineHeight, alignSelf: 'center', padding: '1.5rem 0'}}>
                  <Link
                    to="/#intro"
                    style={{color: t.baseTextColor, ':hover': {textDecoration: 'none'}}}
                  >
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
        }}
      </RadiumStarter>
    );
  }
}

export default Home;
