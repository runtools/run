import React from 'react';
import PropTypes from 'prop-types';
import {withRouter} from 'react-router-dom';
import RadiumStarter, {Button} from 'radium-starter';

@withRouter
export class Action extends React.Component {
  static propTypes = {
    style: PropTypes.object,
    history: PropTypes.object.isRequired
  };

  render() {
    return (
      <RadiumStarter>
        {(_t, s) => {
          const {style, history} = this.props;

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
              <h3
                style={{
                  ...s.subheading,
                  marginBottom: '2rem',
                  textAlign: 'center',
                  maxWidth: '970px'
                }}
              >
                Feeling excited about Run and the potential of resources?<br />Create your first
                resource, and see how easy and powerful it is.
              </h3>
              <Button onClick={() => history.push('/docs')} rsAccent rsLarge>
                Get started
              </Button>
            </div>
          );
        }}
      </RadiumStarter>
    );
  }
}

export default Action;
