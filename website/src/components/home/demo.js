import React from 'react';
import PropTypes from 'prop-types';
import RadiumStarter from 'radium-starter';
import ReactPlayer from 'react-player';
import Media from 'react-media';

export class Demo extends React.Component {
  static propTypes = {
    style: PropTypes.object
  };

  render() {
    return (
      <RadiumStarter>
        {t => {
          const {style} = this.props;

          return (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '4.5rem 1rem 5.5rem 1rem',
                ...style
              }}
            >
              <h2 style={{marginBottom: '3rem', textAlign: 'center'}}>
                Enough talking, show me some action! 🍿️
              </h2>
              <div
                style={{
                  padding: '25px',
                  backgroundColor: 'black',
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  borderColor: t.altBorderColor,
                  borderRadius: '25px',
                  [`@media (max-width: ${t.mediumBreakpoint})`]: {
                    padding: '10px',
                    borderRadius: '10px'
                  },
                  [`@media (max-width: ${t.smallBreakpoint})`]: {
                    padding: '10px',
                    borderRadius: '10px'
                  }
                }}
              >
                <Media
                  query={`(min-width: ${t.mediumBreakpointPlusOne})`}
                  render={() => <Player width="940px" height="587px" />}
                />
                <Media
                  query={`(min-width: ${t.smallBreakpointPlusOne}) and (max-width: ${t.mediumBreakpoint})`}
                  render={() => <Player width="620px" height="387px" />}
                />
                <Media
                  query={`(max-width: ${t.smallBreakpoint})`}
                  render={() => <Player width="280px" height="175px" />}
                />
              </div>
            </div>
          );
        }}
      </RadiumStarter>
    );
  }
}

class Player extends React.Component {
  static propTypes = {
    width: PropTypes.string.isRequired,
    height: PropTypes.string.isRequired
  };

  render() {
    return (
      <ReactPlayer
        url="https://www.youtube.com/watch?v=xo5vHd-WJWc"
        width={this.props.width}
        height={this.props.height}
        volume={1}
        config={{
          youtube: {
            playerVars: {controls: 1, hl: 'en', modestbranding: 0}
          }
        }}
      />
    );
  }
}

export default Demo;
