import React from 'react';
import PropTypes from 'prop-types';
import {withRouter} from 'react-router';
import {withRadiumStarter, Button} from 'radium-starter';

@withRouter
@withRadiumStarter
export class Action extends React.Component {
  static propTypes = {
    style: PropTypes.object,
    history: PropTypes.object.isRequired,
    styles: PropTypes.object.isRequired
  };

  render() {
    const {style, history, styles: s} = this.props;

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
          Feeling excited about Run and the potential of resources?<br />Don't wait. Create your
          first resource.
        </h3>
        <Button onClick={() => history.push('/docs')} rsAccent rsLarge>
          Get started
        </Button>
      </div>
    );
  }
}

export default Action;
