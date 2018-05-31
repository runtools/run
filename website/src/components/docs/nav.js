import React from 'react';
import PropTypes from 'prop-types';
import RadiumStarter from 'radium-starter';

import Link from '../link';

export class NavRoot extends React.Component {
  static propTypes = {
    style: PropTypes.object,
    children: PropTypes.node.isRequired
  };

  render() {
    return (
      <RadiumStarter>
        {(_t, s) => {
          const {style, children} = this.props;

          return (
            <nav style={style}>
              <ul style={{...s.unstyledList, ...s.noMargins}}>{children}</ul>
            </nav>
          );
        }}
      </RadiumStarter>
    );
  }
}

export class NavSection extends React.Component {
  static propTypes = {
    title: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired
  };

  render() {
    return (
      <RadiumStarter>
        {(t, s) => {
          const {title, children} = this.props;

          return (
            <li style={{marginBottom: '.5rem'}}>
              <span style={{color: t.primaryTextColor, fontWeight: 'bold'}}>{title}</span>
              <ul style={{...s.unstyledList, ...s.noMargins, marginLeft: '1rem'}}>{children}</ul>
            </li>
          );
        }}
      </RadiumStarter>
    );
  }
}

export class NavItem extends React.Component {
  static propTypes = {
    title: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    isActive: PropTypes.bool
  };

  render() {
    return (
      <RadiumStarter>
        {t => {
          const {title, url, isActive} = this.props;
          const style = isActive ?
            {color: t.headingsColor, fontWeight: t.headingsFontWeight} :
            {color: t.primaryTextColor};
          return (
            <li>
              <Link to={url} style={style}>
                {title}
              </Link>
            </li>
          );
        }}
      </RadiumStarter>
    );
  }
}
