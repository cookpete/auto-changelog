"use strict";

require("core-js/modules/es.symbol");

require("core-js/modules/es.symbol.description");

require("core-js/modules/es.symbol.iterator");

require("core-js/modules/es.array.concat");

require("core-js/modules/es.array.filter");

require("core-js/modules/es.array.find-index");

require("core-js/modules/es.array.for-each");

require("core-js/modules/es.array.index-of");

require("core-js/modules/es.array.is-array");

require("core-js/modules/es.array.iterator");

require("core-js/modules/es.array.map");

require("core-js/modules/es.array.slice");

require("core-js/modules/es.date.to-iso-string");

require("core-js/modules/es.date.to-string");

require("core-js/modules/es.object.define-properties");

require("core-js/modules/es.object.define-property");

require("core-js/modules/es.object.get-own-property-descriptor");

require("core-js/modules/es.object.get-own-property-descriptors");

require("core-js/modules/es.object.keys");

require("core-js/modules/es.object.to-string");

require("core-js/modules/es.parse-int");

require("core-js/modules/es.promise");

require("core-js/modules/es.regexp.constructor");

require("core-js/modules/es.regexp.exec");

require("core-js/modules/es.regexp.to-string");

require("core-js/modules/es.string.iterator");

require("core-js/modules/es.string.match");

require("core-js/modules/es.string.replace");

require("core-js/modules/es.string.split");

require("core-js/modules/es.string.trim");

require("core-js/modules/web.dom-collections.for-each");

require("core-js/modules/web.dom-collections.iterator");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fetchCommits = fetchCommits;

require("regenerator-runtime/runtime");

var _semver = _interopRequireDefault(require("semver"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var COMMIT_SEPARATOR = '__AUTO_CHANGELOG_COMMIT_SEPARATOR__';
var MESSAGE_SEPARATOR = '__AUTO_CHANGELOG_MESSAGE_SEPARATOR__';
var MATCH_COMMIT = /(.*)\n(?:\s\((.*)\))?\n(.*)\n(.*)\n(.*)\n([\S\s]+)/;
var MATCH_STATS = /(\d+) files? changed(?:, (\d+) insertions?...)?(?:, (\d+) deletions?...)?/;
var BODY_FORMAT = '%B';
var FALLBACK_BODY_FORMAT = '%s%n%n%b'; // https://help.github.com/articles/closing-issues-via-commit-messages

var DEFAULT_FIX_PATTERN = /(?:close[sd]?|fixe?[sd]?|resolve[sd]?)\s(?:#(\d+)|(https?:\/\/.+?\/(?:issues|pull|pull-requests|merge_requests)\/(\d+)))/gi;
var MERGE_PATTERNS = [/Merge pull request #(\d+) from .+\n\n(.+)/, // Regular GitHub merge
/^(.+) \(#(\d+)\)(?:$|\n\n)/, // Github squash merge
/Merged in .+ \(pull request #(\d+)\)\n\n(.+)/, // BitBucket merge
/Merge branch .+ into .+\n\n(.+)[\S\s]+See merge request [^!]*!(\d+)/ // GitLab merge
];

function fetchCommits(_x, _x2) {
  return _fetchCommits.apply(this, arguments);
}

function _fetchCommits() {
  _fetchCommits = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee(remote, options) {
    var branch,
        onProgress,
        command,
        format,
        log,
        _args = arguments;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            branch = _args.length > 2 && _args[2] !== undefined ? _args[2] : null;
            onProgress = _args.length > 3 ? _args[3] : undefined;
            command = branch ? "git log ".concat(branch) : 'git log';
            _context.next = 5;
            return getLogFormat();

          case 5:
            format = _context.sent;
            _context.next = 8;
            return (0, _utils.cmd)("".concat(command, " --shortstat --pretty=format:").concat(format, " ").concat(options.appendGitLog), onProgress);

          case 8:
            log = _context.sent;
            return _context.abrupt("return", parseCommits(log, remote, options));

          case 10:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _fetchCommits.apply(this, arguments);
}

function getLogFormat() {
  return _getLogFormat.apply(this, arguments);
}

function _getLogFormat() {
  _getLogFormat = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee2() {
    var gitVersion, bodyFormat;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return (0, _utils.getGitVersion)();

          case 2:
            gitVersion = _context2.sent;
            bodyFormat = gitVersion && _semver["default"].gte(gitVersion, '1.7.2') ? BODY_FORMAT : FALLBACK_BODY_FORMAT;
            return _context2.abrupt("return", "".concat(COMMIT_SEPARATOR, "%H%n%d%n%ai%n%an%n%ae%n").concat(bodyFormat).concat(MESSAGE_SEPARATOR));

          case 5:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _getLogFormat.apply(this, arguments);
}

function parseCommits(string, remote) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var commits = string.split(COMMIT_SEPARATOR).slice(1).map(function (commit) {
    return parseCommit(commit, remote, options);
  });

  if (options.startingCommit) {
    var index = commits.findIndex(function (c) {
      return c.hash.indexOf(options.startingCommit) === 0;
    });

    if (index === -1) {
      throw new Error("Starting commit ".concat(options.startingCommit, " was not found"));
    }

    return commits.slice(0, index + 1);
  }

  return commits;
}

function parseCommit(commit, remote) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var _commit$match = commit.match(MATCH_COMMIT),
      _commit$match2 = _slicedToArray(_commit$match, 7),
      hash = _commit$match2[1],
      refs = _commit$match2[2],
      date = _commit$match2[3],
      author = _commit$match2[4],
      email = _commit$match2[5],
      tail = _commit$match2[6];

  var _tail$split = tail.split(MESSAGE_SEPARATOR),
      _tail$split2 = _slicedToArray(_tail$split, 2),
      message = _tail$split2[0],
      stats = _tail$split2[1];

  var parsed = _objectSpread({
    hash: hash,
    shorthash: hash.slice(0, 7),
    author: author,
    email: email,
    date: new Date(date).toISOString(),
    tag: getTag(refs, options),
    subject: (0, _utils.replaceText)(getSubject(message), options),
    message: message.trim(),
    fixes: getFixes(message, author, remote, options),
    href: remote.getCommitLink(hash),
    breaking: !!options.breakingPattern && new RegExp(options.breakingPattern).test(message)
  }, getStats(stats.trim()));

  return _objectSpread({}, parsed, {
    merge: getMerge(parsed, message, remote, options)
  });
}

function getTag(refs, options) {
  if (!refs) return null;
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = refs.split(', ')[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var ref = _step.value;
      var prefix = "tag: ".concat(options.tagPrefix);

      if (ref.indexOf(prefix) === 0) {
        var tag = ref.replace(prefix, '');

        if (options.tagPattern) {
          if (new RegExp(options.tagPattern).test(tag)) {
            return tag;
          }

          return null;
        }

        if (_semver["default"].valid(tag)) {
          return tag;
        }
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator["return"] != null) {
        _iterator["return"]();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return null;
}

function getSubject(message) {
  if (!message) {
    return '_No commit message_';
  }

  return message.match(/[^\n]+/)[0];
}

function getStats(stats) {
  if (!stats) return {};

  var _stats$match = stats.match(MATCH_STATS),
      _stats$match2 = _slicedToArray(_stats$match, 4),
      files = _stats$match2[1],
      insertions = _stats$match2[2],
      deletions = _stats$match2[3];

  return {
    files: parseInt(files || 0),
    insertions: parseInt(insertions || 0),
    deletions: parseInt(deletions || 0)
  };
}

function getFixes(message, author, remote) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var pattern = getFixPattern(options);
  var fixes = [];
  var match = pattern.exec(message);
  if (!match) return null;

  while (match) {
    var id = getFixID(match);
    var href = (0, _utils.isLink)(match[2]) ? match[2] : remote.getIssueLink(id);
    fixes.push({
      id: id,
      href: href,
      author: author
    });
    match = pattern.exec(message);
  }

  return fixes;
}

function getFixID(match) {
  // Get the last non-falsey value in the match array
  for (var i = match.length; i >= 0; i--) {
    if (match[i]) {
      return match[i];
    }
  }
}

function getFixPattern(options) {
  if (options.issuePattern) {
    return new RegExp(options.issuePattern, 'g');
  }

  return DEFAULT_FIX_PATTERN;
}

function getMergePatterns(options) {
  if (options.mergePattern) {
    return MERGE_PATTERNS.concat(new RegExp(options.mergePattern, 'g'));
  }

  return MERGE_PATTERNS;
}

function getMerge(commit, message, remote) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var patterns = getMergePatterns(options);
  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = patterns[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var pattern = _step2.value;
      var match = pattern.exec(message);

      if (match) {
        var id = /^\d+$/.test(match[1]) ? match[1] : match[2];

        var _message = /^\d+$/.test(match[1]) ? match[2] : match[1];

        return {
          id: id,
          message: (0, _utils.replaceText)(_message, options),
          href: remote.getMergeLink(id),
          author: commit.author,
          commit: commit
        };
      }
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
        _iterator2["return"]();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  return null;
}