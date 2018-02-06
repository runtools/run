import React from 'react';
import PropTypes from 'prop-types';
import {withRadiumStarter, Button} from 'radium-starter';

@withRadiumStarter
export class Action extends React.Component {
  static propTypes = {
    style: PropTypes.object,
    styles: PropTypes.object.isRequired
  };

  render() {
    const {style, styles: s} = this.props;

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
          Feeling excited about Run and the resource concept?<br />Don't wait, be a pioneer, and
          create your first resource.
        </h3>
        <Button rsAccent rsLarge>
          Create a resource
        </Button>
      </div>
    );
  }
}

export default Action;
