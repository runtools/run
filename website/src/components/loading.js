import React from 'react';

import Header from './header';
import FullHeight from './full-height';
import Spinner from './spinner';

export class Loading extends React.Component {
  render() {
    return (
      <FullHeight>
        <Header />
        <div
          style={{
            flexGrow: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            paddingBottom: '54px' // Header's height
          }}
        >
          <Spinner size={50} />
        </div>
      </FullHeight>
    );
  }
}

export default Loading;
