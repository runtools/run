import React from 'react';
import PropTypes from 'prop-types';
import Radium from 'radium';
const {Style} = Radium;
import {RadiumStarterRoot, withRadiumStarter} from 'radium-starter';
import Color from 'color';

import {highlightJSStyles} from './code';

import Root from './root';

function theme() {
  // Color source: http://flatuicolors.com/palette/defo
  // Use http://serennu.com/colour/colourcalculator.php to calculate variations
  return {
    primaryColor: '#f39c12', // Orange
    accentColor: '#3498db', // Blue
    backgroundColor: '#10171E',
    borderColor: '#444444',
    baseTextColor: '#CCCCCC',
    baseInverseTextColor: t => t.backgroundColor,
    mutedTextColor: '#888888',
    headingsColor: '#ECF0F1', // Almost white
    headingsFontWeight: '500',
    headingsLineHeight: t => t.baseLineHeight,
    linkColor: t => t.accentColor,
    hoveredLinkColor: t =>
      Color(t.linkColor)
        .lighten(0.4)
        .string(),
    codeColor: '#DDDDDD',
    codeBackgroundColor: '#19242F',
    preColor: t => t.codeColor,
    preBackgroundColor: t => t.codeBackgroundColor,
    modularScaleRatio: 1.25,
    // Custom variables
    heroBackgroundColor: '#2980b9',
    heroLinkColor: t => t.headingsColor,
    altBackgroundColor: '#2c3e50',
    altBorderColor: '#888888',
    extraColor1: '#1abc9c', // Aqua
    extraColor2: '#e74c3c', // Red
    extraColor3: '#9b59b6' // Purple
  };
}

function styles(t, _s) {
  return {
    centeredPage: {maxWidth: '1280px', margin: '0 auto'},
    subheading: {fontWeight: '300', color: t.baseTextColor, letterSpacing: '0.03rem'},
    primaryLink: {
      color: t.primaryColor,
      ':hover': {color: t.lightPrimaryColor, textDecoration: 'none'}
    },
    heroLink: {
      color: t.headingsColor,
      ':hover': {color: '#ffffff', textDecoration: 'none'}
    }
  };
}

function globalStyles(t) {
  return {
    hr: {
      marginTop: '1.5rem',
      marginBottom: '1.5rem'
    },
    code: {
      padding: '.2rem .2rem',
      borderRadius: 0,
      fontSize: '.85rem'
    },
    pre: {
      display: 'table',
      tableLayout: 'fixed',
      width: '100%',
      marginTop: '1.3rem',
      marginBottom: '1.3rem',
      padding: '.3rem .6rem',
      fontSize: '.85rem'
    },
    'pre code': {
      display: 'table-cell !important',
      overflowX: 'auto'
    },
    '.json-key .hljs-string': {
      color: '#d19a66' // hljs-attr
    },
    mediaQueries: {
      [`(max-width: ${t.smallBreakpoint})`]: {
        h1: {fontSize: t.h3FontSize, lineHeight: t.smallLineHeight},
        h2: {fontSize: t.h4FontSize},
        h3: {fontSize: t.h5FontSize},
        h4: {fontSize: t.h6FontSize},
        h5: {fontSize: t.h6FontSize},
        code: {fontSize: '.75rem'},
        pre: {fontSize: '.75rem'}
      }
    }
  };
}

export class App extends React.Component {
  render() {
    return (
      <RadiumStarterRoot theme={theme} styles={styles}>
        <Main />
      </RadiumStarterRoot>
    );
  }
}

@withRadiumStarter
class Main extends React.Component {
  static propTypes = {
    theme: PropTypes.object.isRequired
  };

  render() {
    return (
      <div>
        <Style
          rules={{...highlightJSStyles(this.props.theme), ...globalStyles(this.props.theme)}}
        />
        <Root />
      </div>
    );
  }
}

export default App;
