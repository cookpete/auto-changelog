"use strict";

require("core-js/modules/es.symbol");

require("core-js/modules/es.symbol.description");

require("core-js/modules/es.symbol.iterator");

require("core-js/modules/es.array.concat");

require("core-js/modules/es.array.filter");

require("core-js/modules/es.array.find");

require("core-js/modules/es.array.find-index");

require("core-js/modules/es.array.for-each");

require("core-js/modules/es.array.from");

require("core-js/modules/es.array.is-array");

require("core-js/modules/es.array.iterator");

require("core-js/modules/es.array.map");

require("core-js/modules/es.array.reduce");

require("core-js/modules/es.array.slice");

require("core-js/modules/es.array.sort");

require("core-js/modules/es.date.to-iso-string");

require("core-js/modules/es.date.to-string");

require("core-js/modules/es.object.define-properties");

require("core-js/modules/es.object.define-property");

require("core-js/modules/es.object.get-own-property-descriptor");

require("core-js/modules/es.object.get-own-property-descriptors");

require("core-js/modules/es.object.keys");

require("core-js/modules/es.object.to-string");

require("core-js/modules/es.regexp.constructor");

require("core-js/modules/es.regexp.exec");

require("core-js/modules/es.regexp.to-string");

require("core-js/modules/es.string.iterator");

require("core-js/modules/es.string.match");

require("core-js/modules/web.dom-collections.for-each");

require("core-js/modules/web.dom-collections.iterator");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseReleases = parseReleases;
exports.sortReleases = sortReleases;

var _semver = _interopRequireDefault(require("semver"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var MERGE_COMMIT_PATTERN = /^Merge (remote-tracking )?branch '.+'/;
var COMMIT_MESSAGE_PATTERN = /\n+([\S\s]+)/;

function commitReducer(_ref, commit) {
  var map = _ref.map,
      version = _ref.version;
  var currentVersion = commit.tag || version;
  var commits = map[currentVersion] || [];
  return {
    map: _objectSpread({}, map, _defineProperty({}, currentVersion, [].concat(_toConsumableArray(commits), [commit]))),
    version: currentVersion
  };
}

function parseReleases(commits, remote, latestVersion, options) {
  var _commits$reduce = commits.reduce(commitReducer, {
    map: {},
    version: latestVersion
  }),
      map = _commits$reduce.map;

  var releases = Object.keys(map).map(function (key, index, versions) {
    var commits = map[key];
    var previousVersion = versions[index + 1] || null;
    var versionCommit = commits.find(function (commit) {
      return commit.tag;
    }) || {};
    var merges = commits.filter(function (commit) {
      return commit.merge;
    }).map(function (commit) {
      return commit.merge;
    });
    var fixes = commits.filter(function (commit) {
      return commit.fixes;
    }).map(function (commit) {
      return {
        fixes: commit.fixes,
        commit: commit
      };
    });
    var tag = versionCommit.tag || latestVersion;
    var date = versionCommit.date || new Date().toISOString();
    var filteredCommits = commits.filter(function (commit) {
      return filterCommit(commit, options, merges);
    }).sort(commitSorter(options));
    var emptyRelease = merges.length === 0 && fixes.length === 0;
    var tagPattern = options.tagPattern,
        tagPrefix = options.tagPrefix;
    return {
      tag: tag,
      title: tag || 'Unreleased',
      date: date,
      isoDate: date.slice(0, 10),
      niceDate: (0, _utils.niceDate)(date),
      commits: sliceCommits(filteredCommits, options, emptyRelease),
      merges: merges,
      fixes: fixes,
      summary: getSummary(versionCommit.message, options),
      major: Boolean(!tagPattern && tag && previousVersion && _semver["default"].diff(tag, previousVersion) === 'major'),
      href: previousVersion ? remote.getCompareLink("".concat(tagPrefix).concat(previousVersion), tag ? "".concat(tagPrefix).concat(tag) : 'HEAD') : null
    };
  }).filter(function (release) {
    return options.unreleased ? true : release.tag;
  });
  /** Limit releases */

  if (options.tagLimit === 0) {
    return releases;
  }

  return releases.slice(0, options.tagLimit);
}

function sortReleases(a, b) {
  var tags = {
    a: inferSemver(a.tag),
    b: inferSemver(b.tag)
  };

  if (tags.a && tags.b) {
    if (_semver["default"].valid(tags.a) && _semver["default"].valid(tags.b)) {
      return _semver["default"].rcompare(tags.a, tags.b);
    }

    if (tags.a === tags.b) {
      return 0;
    }

    return tags.a < tags.b ? 1 : -1;
  }

  if (tags.a) return 1;
  if (tags.b) return -1;
  return 0;
}

function inferSemver(tag) {
  if (/^v?\d+$/.test(tag)) {
    // v1 becomes v1.0.0
    return "".concat(tag, ".0.0");
  }

  if (/^v?\d+\.\d+$/.test(tag)) {
    // v1.0 becomes v1.0.0
    return "".concat(tag, ".0");
  }

  return tag;
}

function sliceCommits(commits, _ref2, emptyRelease) {
  var commitLimit = _ref2.commitLimit,
      backfillLimit = _ref2.backfillLimit;

  if (commitLimit === false) {
    return commits;
  }

  var limit = emptyRelease ? backfillLimit : commitLimit;
  var minLimit = commits.filter(function (c) {
    return c.breaking;
  }).length;
  return commits.slice(0, Math.max(minLimit, limit));
}

function filterCommit(commit, _ref3, merges) {
  var ignoreCommitPattern = _ref3.ignoreCommitPattern;

  if (commit.fixes || commit.merge) {
    // Filter out commits that already appear in fix or merge lists
    return false;
  }

  if (commit.breaking) {
    return true;
  }

  if (ignoreCommitPattern) {
    // Filter out commits that match ignoreCommitPattern
    return new RegExp(ignoreCommitPattern).test(commit.subject) === false;
  }

  if (_semver["default"].valid(commit.subject)) {
    // Filter out version commits
    return false;
  }

  if (MERGE_COMMIT_PATTERN.test(commit.subject)) {
    // Filter out merge commits
    return false;
  }

  if (merges.findIndex(function (m) {
    return m.message === commit.subject;
  }) !== -1) {
    // Filter out commits with the same message as an existing merge
    return false;
  }

  return true;
}

function getSummary(message, _ref4) {
  var releaseSummary = _ref4.releaseSummary;

  if (!message || !releaseSummary) {
    return null;
  }

  if (COMMIT_MESSAGE_PATTERN.test(message)) {
    return message.match(COMMIT_MESSAGE_PATTERN)[1];
  }

  return null;
}

function commitSorter(_ref5) {
  var sortCommits = _ref5.sortCommits;
  return function (a, b) {
    if (!a.breaking && b.breaking) return 1;
    if (a.breaking && !b.breaking) return -1;
    if (sortCommits === 'date') return new Date(a.date) - new Date(b.date);
    if (sortCommits === 'date-desc') return new Date(b.date) - new Date(a.date);
    return b.insertions + b.deletions - (a.insertions + a.deletions);
  };
}