import React from 'react';
import PropTypes from 'prop-types';
import {withRadiumStarter} from 'radium-starter';

import Terminal from './terminal';

const COMMAND_EXAMPLES = [
  'run deps add lodash',
  'run deps install',
  'run publish --patch',
  'run frontend deploy',
  'run @build',
  'run @test',
  'run deploy',
  'run @create js/resource',
  'run @create js/npm-package',
  'run @create aws/s3-hosted-website',
  'run @add js/transpiler',
  'run @add aws/lambda-hosted-resource',
  'run @add aws/dynamodb-table',
  'run @add web/builder',
  'run @add web/server',
  'run @add method completeTask',
  'run @registry organization create'
];

@withRadiumStarter
export class Hero extends React.Component {
  static propTypes = {
    style: PropTypes.object,
    theme: PropTypes.object.isRequired,
    styles: PropTypes.object.isRequired
  };

  render() {
    const {style, theme: t, styles: s} = this.props;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1.5rem 10px 0 10px',
          ...style
        }}
      >
        <h1 style={{textAlign: 'center'}}>
          Development tooling:{' '}
          <img
            src="/images/checked-icon-v1.immutable.svg"
            alt="Checked icon"
            style={{
              width: '48px',
              height: '48px',
              verticalAlign: '-0.3rem',
              [`@media (max-width: ${t.smallBreakpoint})`]: {
                width: '32px',
                height: '32px',
                verticalAlign: '-0.2rem'
              }
            }}
          />{' '}
          Fixed
        </h1>
        <h3 style={{...s.subheading, maxWidth: '840px', textAlign: 'center'}}>
          Create and use a new generation of tools that are easily configurable, highly composable,
          and automatically installed.
        </h3>
        <Terminal commands={COMMAND_EXAMPLES} style={{marginTop: '1.5rem'}} />
      </div>
    );
  }
}

export default Hero;
