import React from 'react';
import PropTypes from 'prop-types';
import Radium from 'radium';
const {Style} = Radium;
import {withRadiumStarter} from 'radium-starter';

import constants from '../../constants';
import Markdown from '../markdown';

/* eslint-disable no-irregular-whitespace */

const BODY = `
### “Run” – the last tool you'll ever install

Aren't you tired of installing, configuring, or updating your developer tools? There is something fundamentally wrong with the way most tools work today: they come first (i.e., we install them), and then they own our data. We think that it should be the opposite: data should come first and specify which tools they use, then it would be the responsibility of the system to manage installation, updates, etc.

#### Hello, “resources”

In Run's world, a [resource](/docs/introduction/what-is-a-resource) is a JSON (or YAML) document that allows you to specify both data (i.e., configuration) and tools. For example, here is how you would define a website hosted on AWS:

\`\`\`json
{
  "@import": "aws/s3-hosted-website#^0.1.0",
  "domainName": "www.example.com",
  "contentDirectory": "./content"
}
\`\`\`

In the \`content\` directory next to the resource, put all files comprising your website, and then invoke:

\`\`\`shell
run deploy
\`\`\`

Voila! Your website is online. With a minimal effort, it is hosted on AWS using all the state-of-the-art techniques to ensure maximum speed and availability. When you use a tool for the first time, the resource runtime installs it for you, and if there are updates in the future, they are installed automatically.

This example is simple, but it shows a critical aspect of the resources. Data (\`"www.example.com"\`, \`"./content"\`) and tools (\`"aws/s3-hosted-website"\`) are encapsulated into something that is easy to use and share. Just grab the resource file, and you are all set.

What about this \`"aws/s3-hosted-website#^0.1.0"\` thing? Well, it is just a reference to another resource. By importing it, you are inheriting all its attributes and methods. That is how you got the \`"domainName"\` attribute or the \`deploy\` command. Since resources embrace the principles of object-oriented programming, they are highly composable and can represent almost anything.

But where does the \`"aws/s3-hosted-website"\` resource come from? To make things easier, in addition to Run, we are developing a resource directory. Simply named [Resdir](${
  constants.RESDIR_WEBSITE_URL
}), it will be a place of choice to store, share, and discover resources. Although still in development, you can start using it. We are using it ourselves, and we are publishing the [first resources](/docs/introduction/useful-resources); \`"aws/s3-hosted-website"\` is just one of them.
`;

const ASIDE = `
##### Language agnostic

For now, resource methods must be implemented in JavaScript, but more languages will be supported soon. That will open up exciting possibilities for creating resources based on different languages. For example, it will be possible to implement a resource in Ruby that inherits from one written in Go while including another one implemented in Python.

---

##### Remote invocations

Another exciting feature of resources is that they can be [invoked remotely](/docs/introduction/remote-invocation). Using a tool like \`"aws/lambda-hosted-resource"\`, you can deploy a resource to AWS Lambda and then invoke it like you would invoke a local resource. It is even working in the browser. We see this possibility as a fantastic way to create backends – the whole “Web API” issue disappears.

---

##### Namespaces

It is easy to publish a resource to [Resdir](${
  constants.RESDIR_WEBSITE_URL
}) and share it with everyone (or with a selected group of people when your resource is private). Resource's names are always prefixed with a namespace (e.g., \`"aturing/nice-tool"\`) so that there is no conflict. When you register with Resdir, you automatically get a personal namespace, and it is also possible to create namespaces for organizations and communities.
`;

/* eslint-enable no-irregular-whitespace */

@withRadiumStarter
export class Intro extends React.Component {
  static propTypes = {
    style: PropTypes.object,
    theme: PropTypes.object.isRequired
  };

  render() {
    const {style, theme: t} = this.props;

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
        <div className="intro-main" style={{flex: 1.9}}>
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
  }
}

export default Intro;
