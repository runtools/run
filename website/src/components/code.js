import React from 'react';
import PropTypes from 'prop-types';
import Lowlight from 'react-lowlight';

import js from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import shell from 'highlight.js/lib/languages/shell';
import bash from 'highlight.js/lib/languages/bash';

const customJS = hljs => {
  const definition = js(hljs);
  // Here there is an opportunity to customize the language definition
  // Example:
  // definition.keywords.built_in += ' newKeyword'; // eslint-disable-line camelcase
  return definition;
};

Lowlight.registerLanguage('javascript', customJS);
Lowlight.registerLanguage('js', customJS);
Lowlight.registerLanguage('json', json);
Lowlight.registerLanguage('json-key', json);
Lowlight.registerLanguage('xml', xml);
Lowlight.registerLanguage('html', xml);
Lowlight.registerLanguage('shell', shell);
Lowlight.registerLanguage('bash', bash);

export class Code extends React.Component {
  static propTypes = {
    language: PropTypes.string,
    children: PropTypes.string.isRequired
  };

  render() {
    const {language, children: value} = this.props;
    return <Lowlight language={language} value={value} inline />;
  }
}

export function highlightJSStyles(t) {
  // Source: https://github.com/isagalaev/highlight.js/blob/master/src/styles/atom-one-dark.css
  return {
    '.hljs-comment, .hljs-quote': {
      color: t.mutedTextColor,
      fontStyle: 'italic'
    },
    '.hljs-doctag, .hljs-formula': {
      color: t.extraColor1
    },
    '.hljs-keyword': {
      color: t.codeColor // Color removed to avoid an issue with '@import', '@export', etc.
    },
    '.hljs-section, .hljs-name, .hljs-selector-tag, .hljs-deletion, .hljs-subst': {
      color: t.extraColor2
    },
    '.hljs-literal': {
      color: t.accentColor
    },
    '.hljs-string, .hljs-regexp, .hljs-addition, .hljs-attribute, .hljs-meta-string': {
      color: t.primaryColor
    },
    '.hljs-built_in': {
      color: t.codeColor // Color removed to avoid an issue with '@import', '@export', etc.
    },
    '.hljs-class .hljs-title': {
      color: t.accentColor
    },
    '.hljs-attr, .hljs-variable, .hljs-template-variable, .hljs-type, .hljs-selector-class, .hljs-selector-attr, .hljs-selector-pseudo, .hljs-number': {
      color: t.accentColor
    },
    '.hljs-symbol, .hljs-bullet, .hljs-link, .hljs-meta, .hljs-selector-id, .hljs-title': {
      color: t.extraColor1
    },
    '.hljs-emphasis': {
      fontStyle: 'italic'
    },
    '.hljs-strong': {
      fontWeight: 'bold'
    },
    '.hljs-link': {
      textDecoration: 'underline'
    },
    // Here we put back the removed color, but only in the context of a <pre>
    'pre code .hljs-built_in, pre code .hljs-keyword': {
      color: t.extraColor1
    }
  };
}

export default Code;
