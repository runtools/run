import React from 'react';
import PropTypes from 'prop-types';
import RadiumStarter from 'radium-starter';

import Terminal from './terminal';

const COMMAND_EXAMPLES = [
  'run ./backend deps add lodash',
  'run . deps install',
  'run . publish --patch',
  'run ./website deploy',
  'run ./backend @build',
  'run ./frontend @test',
  'run @create js/resource',
  'run @create js/npm-package',
  'run @create aws/s3-hosted-website',
  'run . @add js/transpiler',
  'run . @add aws/lambda-hosted-resource',
  'run . @add aws/dynamodb-table',
  'run @registry organization create'
];

export class Hero extends React.Component {
  static propTypes = {
    style: PropTypes.object
  };

  render() {
    return (
      <RadiumStarter>
        {(t, s) => {
          const {style} = this.props;

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
                Create and use a new generation of tools that are easily configurable, highly
                composable, and automatically installed.
              </h3>
              <Terminal commands={COMMAND_EXAMPLES} style={{marginTop: '1.5rem'}} />
            </div>
          );
        }}
      </RadiumStarter>
    );
  }
}

export default Hero;
