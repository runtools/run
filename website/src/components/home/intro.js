import React from 'react';
import PropTypes from 'prop-types';
import Radium from 'radium';
const {Style} = Radium;
import RadiumStarter from 'radium-starter';

import constants from '../../constants';
import Markdown from '../markdown';

/* eslint-disable no-irregular-whitespace */

const BODY = `
### “Run” – the resource runtime

Although we have beautiful graphical user interfaces, it seems that we are using more and more command-line tools. Many of them are really good, but they could be even better if they were based on more modern foundations than our Unix-like systems and their good old shells. It's not about replacing the command line; it's about building something on top of it to enable tools that are [more customizable and easy to use](https://medium.freecodecamp.org/lets-fix-the-good-old-command-line-b6eaa1f9c040).

#### Hello, “resources”

In Run's world, a [resource](/docs/introduction/what-is-a-resource) is a kind of object stored in a JSON or YAML document that allows specifying the tools that your project consumes (using inheritance and composition), some configuration data (using attributes), and possibly, some custom behaviors (using methods).

For example, to build a website hosted on AWS, you can start with something like this:

\`\`\`json
{
  "@import": "aws/s3-hosted-website#^0.1.0",
  "domainName": "www.example.com",
  "contentDirectory": "./content"
}
\`\`\`

To deploy the website, just invoke:

\`\`\`shell
run . deploy
\`\`\`

Voila! Your website is online. When you use a tool for the first time, Run installs it automatically in a global cache, and since tool references and configuration are grouped together, your project is super easy to transport and share. Just grab the resource file and you are all set.

What about this \`"aws/s3-hosted-website#^0.1.0"\` thing? It's a reference to a resource implementing a tool stored in [Resdir](${
  constants.RESDIR_WEBSITE_URL
}), the first resource directory. Although still in development, you can start using Resdir through Run's CLI. The publication of resources is just beginning, but there are already [a few tools](/docs/introduction/useful-resources) that you might find interesting to experiment with.
`;

const ASIDE = `
##### Remote invocation

An exciting feature of resources is that they can be [invoked remotely](/docs/introduction/remote-invocation). Using a tool like \`"aws/lambda-hosted-resource"\`, you can deploy a resource to AWS Lambda and then invoke it like you would invoke a local resource. It is even working in the browser. We see this possibility as a fantastic way to create backends – the whole “Web API” problem disappears.

---

##### Language agnostic

Resources are designed to be language agnostic. We start with JavaScript because, well, it's kind of universal, but more languages will come in the future, and it will open up exciting possibilities for creating resources mixing different languages. For example, it will be possible to implement a resource in Ruby that inherits from one written in Go while embedding another one implemented in Python.

---

##### Namespaces

It is easy to publish a resource to [Resdir](${
  constants.RESDIR_WEBSITE_URL
}) and share it with everyone. Resource's names are always prefixed with a namespace (e.g., \`"aturing/nice-tool"\`) so that there is no conflict. When you register with Resdir, you automatically get a personal namespace, and it is also possible to create namespaces for organizations and communities.
`;

/* eslint-enable no-irregular-whitespace */

export class Intro extends React.Component {
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
              id="intro"
              style={{
                display: 'flex',
                alignItems: 'baseline',
                padding: '4.5rem 1.5rem',
                ...style,
                [`@media (max-width: ${t.mediumBreakpointMinusOne})`]: {
                  flexDirection: 'column'
                }
              }}
            >
              <div className="intro-main" style={{flex: 1.8}}>
                <Style scopeSelector=".intro-main" rules={{h3: {color: t.primaryColor}}} />
                <Markdown>{BODY}</Markdown>
              </div>

              <div
                style={{
                  flex: 1,
                  marginLeft: '3rem',
                  [`@media (max-width: ${t.mediumBreakpointMinusOne})`]: {
                    marginLeft: 0
                  }
                }}
              >
                <Markdown>{ASIDE}</Markdown>
              </div>
            </div>
          );
        }}
      </RadiumStarter>
    );
  }
}

export default Intro;
