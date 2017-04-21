import {avoidCommonMistakes, addContextToErrors} from 'run-common';

import Component from './component';
import Property from './property';
import Version from './version';

export class Resource extends Component {
  static DEFAULT_FILE_NAME = 'resource';

  static BUILT_IN_PROPERTIES = [
    ...Component.BUILT_IN_PROPERTIES,
    ...Property.createMany(['version', 'description', 'authors', 'repository', 'license'])
  ];

  constructor(definition = {}, options) {
    super(definition, options);
    addContextToErrors(() => {
      avoidCommonMistakes(definition, {author: 'authors'});
    }).call(this);
  }

  get version() {
    return this._version;
  }

  set version(version: ?(string | Version)) {
    if (typeof version === 'string') {
      version = new Version(version);
    }
    this._version = version;
  }

  get description() {
    return this._description;
  }

  set description(description: ?string) {
    this._description = description;
  }

  get authors() {
    return this._authors && this._authors.length ? this._authors : undefined;
  }

  set authors(authors: ?(Array<string> | string)) {
    if (typeof authors === 'string') {
      authors = [authors];
    }
    this._authors = authors && authors.length ? authors : undefined;
  }

  get repository() {
    return this._repository;
  }

  set repository(repository: ?string) {
    this._repository = repository;
  }

  get license() {
    return this._license;
  }

  set license(license: ?string) {
    this._license = license;
  }
}

export default Resource;
