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

Aren't you tired of installing, configuring or updating your developer tools? There is something fundamentally wrong with the way most of the tools work today: they control our data. We think that this should be the opposite: data should control tools. As a user, the real thing that we care about is our data (documents, configuration files, etc.). These data should just specify which tools to use, and then it should be the responsibility of the system to take care of installation or updates.

#### Hello, “resources”

In Run's world, a resource is a JSON (or YAML) document that allows you to specify both data (e.g., configuration) and tools. For example, here is how you would define a website hosted on AWS:

\`\`\`json
{
  "@import": "aws/s3-hosted-website#^0.1.0",
  "domainName": "www.example.com",
  "contentDirectory": "./content"
}
\`\`\`

In the \`content\` directory next to your resource, put the files that compose your website, and then invoke Run as follows:

\`\`\`shell
run deploy
\`\`\`

And voila! Your website is online. With a minimal effort, it is hosted on AWS using all the state-of-the-art techniques to ensure maximum speed and availability. When you use a tool for the first time, the resource runtime installs it for you, and if there are updates in the future, they are automatically installed as well.

This example is oversimplified, but it shows a critical aspect of the resource concept. Data (\`"domainName"\`, \`"contentDirectory"\`) and tools (\`"aws/s3-hosted-website"\`) are encapsulated into something that is easy to use and share to other people (or to the future of you). Just get the resource file, and you are all set.

What about this \`"aws/s3-hosted-website#^0.1.0"\` string? Well, it is just a reference to another resource. By importing it, you are inheriting all its attributes and methods. This is how you get the \`"domainName"\` attribute or the \`deploy\` command. Embracing the principles of object-oriented programming, resources can represent almost anything (documents, configs, tools, APIs, libraries,...), and they are highly extendable and composable.

But where does the \`"aws/s3-hosted-website"\` resource come from? To make things easier, in addition to Run, we are developing a resource directory. Simply named [Resdir](${
  constants.RESDIR_WEBSITE_URL
}), it will be a place of choice to store, share and discover resources. Although still in development, you can start using it. We are using it ourselves, and we are publishing our first resources, \`"aws/s3-hosted-website"\` is just one of them.
`;

const ASIDE = `
##### Resdir, the resource directory

It is easy to publish a resource to [Resdir](${
  constants.RESDIR_WEBSITE_URL
}) and share it with everyone (or with a selected group of people when your resource is private). Resource's names are always prefixed with a namespace (e.g., \`"aturing/nice-tool"\`) so that there is no conflict. When you create a Resdir account, you get a personal namespace, and it is also possible to create namespaces for organizations and communities.

---

##### Language agnostic

For now, resource's methods must be implemented in JavaScript because the Run's resource runtime knows only about this language. But more runtimes will come in the future. That will open up exciting possibilities for creating resources based on different languages. For example, it will be possible to implement a resource in Ruby that inherits from one written in Go while including another one implemented in Python.

---

##### Remote invocations

Another exciting feature of resources is that they can be invoked remotely. Using a tool like \`"aws/lambda-hosted-resource"\`, you can deploy a resource to AWS Lambda, and invoke it the same way you would invoke a local resource. It can even work in the browser. We see this possibility as a cheap way to create backends – the whole “Web API” part disappears.
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
          <Style scopeSelector=".intro-main" rules={{h3: {color: t.accentColor}}} />
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
