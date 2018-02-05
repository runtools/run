import React from 'react';
import PropTypes from 'prop-types';
import {withRadiumStarter} from 'radium-starter';

import Link from '../link';

@withRadiumStarter
export class NavRoot extends React.Component {
  static propTypes = {
    style: PropTypes.object,
    styles: PropTypes.object.isRequired,
    children: PropTypes.node.isRequired
  };

  render() {
    const {style, styles: s, children} = this.props;

    return (
      <nav style={style}>
        <ul style={{...s.unstyledList, ...s.noMargins}}>{children}</ul>
      </nav>
    );
  }
}

@withRadiumStarter
export class NavSection extends React.Component {
  static propTypes = {
    title: PropTypes.string.isRequired,
    theme: PropTypes.object.isRequired,
    styles: PropTypes.object.isRequired,
    children: PropTypes.node.isRequired
  };

  render() {
    const {title, theme: t, styles: s, children} = this.props;

    return (
      <li style={{marginBottom: '.5rem'}}>
        <span style={{color: t.primaryTextColor, fontWeight: 'bold'}}>{title}</span>
        <ul style={{...s.unstyledList, ...s.noMargins, marginLeft: '1rem'}}>{children}</ul>
      </li>
    );
  }
}

@withRadiumStarter
export class NavItem extends React.Component {
  static propTypes = {
    title: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    isActive: PropTypes.bool,
    theme: PropTypes.object.isRequired
  };

  render() {
    const {title, url, isActive, theme: t} = this.props;
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
  }
}
