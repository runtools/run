import React from 'react';
import PropTypes from 'prop-types';
import {withRadiumStarter} from 'radium-starter';

@withRadiumStarter
export class Demo extends React.Component {
  static propTypes = {
    style: PropTypes.object,
    theme: PropTypes.object.isRequired
  };

  render() {
    const {style, theme: t} = this.props;

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
            [`@media (max-width: ${t.mediumBreakpoint})`]: {padding: '10px', borderRadius: '10px'},
            [`@media (max-width: ${t.smallBreakpoint})`]: {padding: '10px', borderRadius: '10px'}
          }}
        >
          <iframe
            src="https://www.youtube.com/embed/qgNbuNve4bw?rel=0&showinfo=0"
            frameBorder="0"
            allowFullScreen
            style={{
              width: '940px',
              height: '587px',
              [`@media (max-width: ${t.mediumBreakpoint})`]: {width: '620px', height: '387px'},
              [`@media (max-width: ${t.smallBreakpoint})`]: {width: '280px', height: '175px'}
            }}
          />
        </div>
      </div>
    );
  }
}

export default Demo;
