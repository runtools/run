import React from 'react';
import PropTypes from 'prop-types';
import {withRadiumStarter} from 'radium-starter';
import {withRouter} from 'react-router';
import {getJSON, get} from '@resdir/http-client';
// import sleep from 'sleep-promise';

import Layout from '../layout';
import {withErrorBoundary, catchErrors} from '../error-boundary';
import Loading from '../loading';
import NotFound from '../not-found';
import {NavRoot, NavSection, NavItem} from './nav';
import Markdown from '../markdown';

const DOCS_BASE_URL = 'https://raw.githubusercontent.com/resdir/resdir/master/docs/content/';
const DOCS_INDEX_PATH = 'index.json';
const CHAPTER_FILE_EXTENSION = '.md';

@withRouter
@withErrorBoundary
@withRadiumStarter
export class Docs extends React.Component {
  static propTypes = {
    match: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    theme: PropTypes.object.isRequired,
    styles: PropTypes.object.isRequired
  };

  state = {
    contents: undefined,
    chapter: undefined,
    isLoading: true
  };

  componentDidMount() {
    this.load();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.location.pathname !== this.props.location.pathname) {
      this.loadChapter(nextProps.location.pathname);
    }
  }

  @catchErrors
  async load() {
    // await sleep(3000);
    const contents = await this._loadContents();
    this.setState({contents}, () => this.loadChapter(this.props.location.pathname));
  }

  async _loadContents() {
    const url = DOCS_BASE_URL + DOCS_INDEX_PATH;
    let {body: contents} = await getJSON(url);
    if (typeof contents === 'string') {
      contents = JSON.parse(contents);
    }

    const rootURL = this.props.match.path;
    let firstChapter = true;
    for (const book of contents.books) {
      for (const chapter of book.chapters) {
        chapter.url = rootURL + '/' + chapter.path;
        chapter.url = chapter.url.slice(0, -CHAPTER_FILE_EXTENSION.length);
        chapter.alternateURLs = [];
        if (firstChapter) {
          chapter.alternateURLs.push(rootURL);
          chapter.alternateURLs.push(rootURL + '/');
          firstChapter = false;
        }
      }
    }

    return contents;
  }

  @catchErrors
  async loadChapter(url) {
    const chapter = this._findChapter(url);
    if (chapter && !chapter.text) {
      const {body: text} = await get(DOCS_BASE_URL + chapter.path);
      chapter.text = text;
    }
    this.setState({chapter, isLoading: false});
  }

  _findChapter(url) {
    for (const book of this.state.contents.books) {
      for (const chapter of book.chapters) {
        if (chapter.url === url || chapter.alternateURLs.includes(url)) {
          return chapter;
        }
      }
    }
  }

  render() {
    const {theme: t, styles: s} = this.props;

    if (this.state.isLoading) {
      return <Loading />;
    }

    if (this.state.contents && !this.state.chapter) {
      return <NotFound />;
    }

    return (
      <Layout style={{alignItems: 'center'}}>
        <div
          style={{
            ...s.centeredPage,
            display: 'flex',
            justifyContent: 'center',
            padding: '2rem 1.5rem',
            [`@media (max-width: ${t.mediumBreakpointMinusOne})`]: {
              flexDirection: 'column'
            }
          }}
        >
          <Contents data={this.state.contents} style={{flexBasis: '18rem'}} />
          <Chapter
            data={this.state.chapter}
            style={{
              flexBasis: '42rem',
              [`@media (max-width: ${t.mediumBreakpointMinusOne})`]: {
                order: -1
              }
            }}
          />
        </div>
      </Layout>
    );
  }
}

@withRouter
export class Contents extends React.Component {
  static propTypes = {
    style: PropTypes.object,
    data: PropTypes.object,
    location: PropTypes.object.isRequired
  };

  render() {
    const {style, data, location} = this.props;

    if (!data) {
      return null;
    }

    return (
      <NavRoot style={style}>
        {data.books.map((book, index) => (
          <NavSection key={index} title={book.title}>
            {book.chapters.map((chapter, index) => {
              return (
                <NavItem
                  key={index}
                  title={chapter.title}
                  url={chapter.url}
                  isActive={
                    chapter.url === location.pathname ||
                    chapter.alternateURLs.includes(location.pathname)
                  }
                />
              );
            })}
          </NavSection>
        ))}
      </NavRoot>
    );
  }
}

@withRadiumStarter
export class Chapter extends React.Component {
  static propTypes = {
    style: PropTypes.object,
    data: PropTypes.object
  };

  render() {
    const {data} = this.props;
    if (!data) {
      return null;
    }

    return (
      <div style={this.props.style}>
        <Markdown>{data.text}</Markdown>
      </div>
    );
  }
}

export default Docs;
