import React from 'react';
import RadiumStarter from 'radium-starter';

export class Banner extends React.Component {
  render() {
    return (
      <RadiumStarter>
        {t => {
          return (
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
          );
        }}
      </RadiumStarter>
    );
  }
}

export default Banner;
