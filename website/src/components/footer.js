import React from 'react';
import PropTypes from 'prop-types';
import {withRadiumStarter} from 'radium-starter';

import Link from './link';

@withRadiumStarter
export class Footer extends React.Component {
  static propTypes = {
    style: PropTypes.object,
    theme: PropTypes.object.isRequired,
    styles: PropTypes.object.isRequired
  };

  render() {
    const {style, theme: t, styles: s} = this.props;

    const columnGapStyle = {
      width: '6rem',
      [`@media (max-width: ${t.smallBreakpoint})`]: {width: '3rem'}
    };
    const menuStyle = [s.unstyledList, s.noMargins];
    const menuItemStyle = [{marginBottom: '.5rem'}];
    const menuItemLinkStyle = [{':hover': {textDecoration: 'none'}}];

    return (
      <footer style={{padding: '3rem 0', backgroundColor: t.alternateBackgroundColor}}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            ...style
          }}
        >
          <div>
            <ul style={[menuStyle]}>
              <li style={menuItemStyle}>
                <Link key="footer-docs" to="/docs" style={menuItemLinkStyle}>
                  Docs
                </Link>
              </li>
              <li style={menuItemStyle}>
                <a
                  key="footer-support"
                  href="https://github.com/runtools/run/issues"
                  style={menuItemLinkStyle}
                >
                  Support
                </a>
              </li>
              <li style={menuItemStyle}>
                <Link key="footer-contact" to="/contact" style={menuItemLinkStyle}>
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div style={[columnGapStyle]}>&nbsp;</div>
          <div>
            <ul style={[menuStyle]}>
              <li style={menuItemStyle}>
                <a
                  key="footer-github"
                  href="https://github.com/runtools/run"
                  style={menuItemLinkStyle}
                >
                  GitHub
                </a>
              </li>
              <li style={menuItemStyle}>
                <a
                  key="footer-twitter"
                  href="https://twitter.com/run_tools"
                  style={menuItemLinkStyle}
                >
                  Twitter
                </a>
              </li>
              <li style={menuItemStyle}>
                <a
                  key="footer-youtube"
                  href="https://www.youtube.com/channel/UC_gpblbXG6nwjC5M3GpTUvg"
                  style={menuItemLinkStyle}
                >
                  YouTube
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div style={{marginTop: '3rem', textAlign: 'center'}}>
          <small style={{color: t.mutedTextColor}}>
            Opensourced by{' '}
            <a href="https://1place.io/" style={{color: t.primaryTextColor}}>
              1Place Inc.
            </a>
          </small>
        </div>
      </footer>
    );
  }
}

export default Footer;
