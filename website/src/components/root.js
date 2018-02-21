import React from 'react';
import PropTypes from 'prop-types';
import {BrowserRouter as Router, Route, Switch, withRouter} from 'react-router-dom';
import Analytics from 'react-router-ga';

import constants from '../constants';
import Home from './home';
import Docs from './docs';
import Contact from './contact';
import NotFound from './not-found';

export class Root extends React.Component {
  render() {
    return (
      <Router>
        <Analytics id={constants.GOOGLE_ANALYTICS_TRACKING_ID}>
          <ScrollToTop>
            <Switch>
              <Route exact path="/" component={Home} />
              <Route path="/docs" component={Docs} />
              <Route path="/contact" component={Contact} />
              <Route component={NotFound} />
            </Switch>
          </ScrollToTop>
        </Analytics>
      </Router>
    );
  }
}

@withRouter
class ScrollToTop extends React.Component {
  static propTypes = {
    location: PropTypes.object.isRequired,
    children: PropTypes.node.isRequired
  };

  componentDidUpdate(prevProps) {
    if (this.props.location !== prevProps.location) {
      window.scrollTo(0, 0);
    }
  }

  render() {
    return this.props.children;
  }
}

export default Root;
