import React from 'react';
import PropTypes from 'prop-types';
import remark from 'remark';
import remarkReactRenderer from 'remark-react';
import githubSanitization from 'hast-util-sanitize/lib/github.json';
import cloneDeep from 'lodash/cloneDeep';

import Link from './link';
import Code from './code';

// GitHub sanitization schema excludes className, but we want it for highlighting!
const sanitization = cloneDeep(githubSanitization);
sanitization.attributes.code = ['className'];

export class Markdown extends React.Component {
  static propTypes = {
    children: PropTypes.string.isRequired
  };

  render() {
    return remark()
      .use(remarkReactRenderer, {
        sanitize: sanitization,
        remarkReactComponents: {
          a: ({href, children}) => {
            if (href.match(/^https?:\/\//i) || href.startsWith('mailto:')) {
              // External Link
              return <a href={href}>{children}</a>;
            }
            return <Link to={href}>{children}</Link>;
          },
          code: ({className, children}) => {
            let language;
            if (className && className.startsWith('language-')) {
              language = className.slice('language-'.length);
            }
            return <Code language={language}>{children[0]}</Code>;
          }
        }
      })
      .processSync(this.props.children).contents;
  }
}

export default Markdown;
