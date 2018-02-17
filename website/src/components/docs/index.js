import React from 'react';
import PropTypes from 'prop-types';
import {withRadiumStarter} from 'radium-starter';
import {withRouter} from 'react-router';
import {getJSON, get} from '@resdir/http-client';

import {globals, resolveGlobals} from '../../globals';
import Layout from '../layout';
import {withErrorBoundary, catchErrors} from '../error-boundary';
import Link from '../link';
import Loading from '../loading';
import NotFound from '../not-found';
import Spinner from '../spinner';
import {NavRoot, NavSection, NavItem} from './nav';
import Markdown from '../markdown';

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
    nextChapter: undefined,
    isLoadingContents: true,
    isLoadingChapter: true
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
    this.setState({isLoadingContents: true});
    const contents = await this._loadContents();
    this.setState({contents, isLoadingContents: false}, () => {
      this.loadChapter(this.props.location.pathname);
    });
  }

  async _loadContents() {
    const url = globals.DOCS_BASE_URL + '/' + DOCS_INDEX_PATH;
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
    const {chapter, nextChapter} = this._findChapter(url);
    if (chapter && !chapter.text) {
      this.setState({chapter: undefined, nextChapter: undefined, isLoadingChapter: true});
      let {body: text} = await get(globals.DOCS_BASE_URL + '/' + chapter.path);
      text = resolveGlobals(text);
      chapter.text = text;
    }
    this.setState({chapter, nextChapter, isLoadingChapter: false});
  }

  _findChapter(url) {
    for (const book of this.state.contents.books) {
      for (let i = 0; i < book.chapters.length; i++) {
        const chapter = book.chapters[i];
        if (chapter.url === url || chapter.alternateURLs.includes(url)) {
          const nextChapter = book.chapters[i + 1];
          return {chapter, nextChapter};
        }
      }
    }
  }

  render() {
    const {theme: t, styles: s} = this.props;

    if (this.state.isLoadingContents) {
      return <Loading />;
    }

    if (!this.state.isLoadingChapter && !this.state.chapter) {
      return <NotFound />;
    }

    return (
      <Layout style={{alignItems: 'center'}}>
        <div
          style={{
            ...s.centeredPage,
            display: 'flex',
            justifyContent: 'center',
            padding: '2rem 1.5rem 3rem 1.5rem',
            [`@media (max-width: ${t.mediumBreakpointMinusOne})`]: {
              flexDirection: 'column'
            }
          }}
        >
          <Contents
            content={this.state.contents}
            style={{
              width: '18rem',
              [`@media (max-width: ${t.mediumBreakpointMinusOne})`]: {
                width: '100%',
                marginTop: '1.5rem'
              }
            }}
          />
          <Chapter
            content={this.state.chapter}
            nextContent={this.state.nextChapter}
            style={{
              width: '42rem',
              [`@media (max-width: ${t.mediumBreakpointMinusOne})`]: {
                order: -1,
                width: '100%'
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
    content: PropTypes.object,
    location: PropTypes.object.isRequired
  };

  render() {
    const {style, content, location} = this.props;

    if (!content) {
      return null;
    }

    return (
      <NavRoot style={style}>
        {content.books.map((book, index) => (
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
    content: PropTypes.object,
    nextContent: PropTypes.object,
    theme: PropTypes.object.isRequired
  };

  render() {
    const {style, content, nextContent, theme: t} = this.props;

    if (!content) {
      return (
        <div
          style={{
            height: '100vh',
            marginTop: '-100px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            ...style
          }}
        >
          <Spinner size={50} />
        </div>
      );
    }

    return (
      <div style={style}>
        <Markdown>{content.text}</Markdown>
        {nextContent ? (
          <div>
            <hr style={{marginTop: '1.75rem', marginBottom: '1.75rem'}} />
            <div>
              <span style={{color: t.mutedTextColor}}>Next:</span>{' '}
              <Link to={nextContent.url}>{nextContent.title} →</Link>
            </div>
          </div>
        ) : null}
      </div>
    );
  }
}

export default Docs;
