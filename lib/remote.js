"use strict";

require("core-js/modules/es.symbol");

require("core-js/modules/es.array.concat");

require("core-js/modules/es.array.filter");

require("core-js/modules/es.array.for-each");

require("core-js/modules/es.object.define-properties");

require("core-js/modules/es.object.define-property");

require("core-js/modules/es.object.get-own-property-descriptor");

require("core-js/modules/es.object.get-own-property-descriptors");

require("core-js/modules/es.object.keys");

require("core-js/modules/es.object.to-string");

require("core-js/modules/es.promise");

require("core-js/modules/es.regexp.exec");

require("core-js/modules/es.string.replace");

require("core-js/modules/web.dom-collections.for-each");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fetchRemote = fetchRemote;

require("regenerator-runtime/runtime");

var _parseGithubUrl = _interopRequireDefault(require("parse-github-url"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function fetchRemote(_x) {
  return _fetchRemote.apply(this, arguments);
}

function _fetchRemote() {
  _fetchRemote = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee(options) {
    var remoteURL;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return (0, _utils.cmd)("git config --get remote.".concat(options.remote, ".url"));

          case 2:
            remoteURL = _context.sent;
            return _context.abrupt("return", getRemote(remoteURL, options));

          case 4:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _fetchRemote.apply(this, arguments);
}

function getRemote(remoteURL) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var overrides = getOverrides(options);

  if (!remoteURL) {
    // No point warning if everything is overriddens
    if (Object.keys(overrides).length !== 4) {
      console.warn("Warning: Git remote ".concat(options.remote, " was not found"));
    }

    return _objectSpread({
      getCommitLink: function getCommitLink() {
        return null;
      },
      getIssueLink: function getIssueLink() {
        return null;
      },
      getMergeLink: function getMergeLink() {
        return null;
      },
      getCompareLink: function getCompareLink() {
        return null;
      }
    }, overrides);
  }

  var remote = (0, _parseGithubUrl["default"])(remoteURL);
  var protocol = remote.protocol === 'http:' ? 'http:' : 'https:';
  var hostname = remote.hostname || remote.host;
  var IS_BITBUCKET = /bitbucket/.test(hostname);
  var IS_GITLAB = /gitlab/.test(hostname);
  var IS_GITLAB_SUBGROUP = /\.git$/.test(remote.branch);
  var IS_AZURE = /dev\.azure/.test(hostname);
  var IS_VISUAL_STUDIO = /visualstudio/.test(hostname);

  if (IS_BITBUCKET) {
    var _url = "".concat(protocol, "//").concat(hostname, "/").concat(remote.repo);

    return _objectSpread({
      getCommitLink: function getCommitLink(id) {
        return "".concat(_url, "/commits/").concat(id);
      },
      getIssueLink: function getIssueLink(id) {
        return "".concat(_url, "/issues/").concat(id);
      },
      getMergeLink: function getMergeLink(id) {
        return "".concat(_url, "/pull-requests/").concat(id);
      },
      getCompareLink: function getCompareLink(from, to) {
        return "".concat(_url, "/compare/").concat(to, "..").concat(from);
      }
    }, overrides);
  }

  if (IS_GITLAB) {
    var _url2 = IS_GITLAB_SUBGROUP ? "".concat(protocol, "//").concat(hostname, "/").concat(remote.repo, "/").concat(remote.branch.replace(/\.git$/, '')) : "".concat(protocol, "//").concat(hostname, "/").concat(remote.repo);

    return _objectSpread({
      getCommitLink: function getCommitLink(id) {
        return "".concat(_url2, "/commit/").concat(id);
      },
      getIssueLink: function getIssueLink(id) {
        return "".concat(_url2, "/issues/").concat(id);
      },
      getMergeLink: function getMergeLink(id) {
        return "".concat(_url2, "/merge_requests/").concat(id);
      },
      getCompareLink: function getCompareLink(from, to) {
        return "".concat(_url2, "/compare/").concat(from, "...").concat(to);
      }
    }, overrides);
  }

  if (IS_AZURE || IS_VISUAL_STUDIO) {
    var _url3 = IS_AZURE ? "".concat(protocol, "//").concat(hostname, "/").concat(remote.path) : "".concat(protocol, "//").concat(hostname, "/").concat(remote.repo, "/").concat(remote.branch);

    var project = IS_AZURE ? "".concat(protocol, "//").concat(hostname, "/").concat(remote.repo) : "".concat(protocol, "//").concat(hostname, "/").concat(remote.owner);
    return _objectSpread({
      getCommitLink: function getCommitLink(id) {
        return "".concat(_url3, "/commit/").concat(id);
      },
      getIssueLink: function getIssueLink(id) {
        return "".concat(project, "/_workitems/edit/").concat(id);
      },
      getMergeLink: function getMergeLink(id) {
        return "".concat(_url3, "/pullrequest/").concat(id);
      },
      getCompareLink: function getCompareLink(from, to) {
        return "".concat(_url3, "/branches?baseVersion=GT").concat(to, "&targetVersion=GT").concat(from, "&_a=commits");
      }
    }, overrides);
  }

  var url = "".concat(protocol, "//").concat(hostname, "/").concat(remote.repo);
  return _objectSpread({
    getCommitLink: function getCommitLink(id) {
      return "".concat(url, "/commit/").concat(id);
    },
    getIssueLink: function getIssueLink(id) {
      return "".concat(url, "/issues/").concat(id);
    },
    getMergeLink: function getMergeLink(id) {
      return "".concat(url, "/pull/").concat(id);
    },
    getCompareLink: function getCompareLink(from, to) {
      return "".concat(url, "/compare/").concat(from, "...").concat(to);
    }
  }, overrides);
}

function getOverrides(_ref) {
  var commitUrl = _ref.commitUrl,
      issueUrl = _ref.issueUrl,
      mergeUrl = _ref.mergeUrl,
      compareUrl = _ref.compareUrl;
  var overrides = {};
  if (commitUrl) overrides.getCommitLink = function (id) {
    return commitUrl.replace('{id}', id);
  };
  if (issueUrl) overrides.getIssueLink = function (id) {
    return issueUrl.replace('{id}', id);
  };
  if (mergeUrl) overrides.getMergeLink = function (id) {
    return mergeUrl.replace('{id}', id);
  };
  if (compareUrl) overrides.getCompareLink = function (from, to) {
    return compareUrl.replace('{from}', from).replace('{to}', to);
  };
  return overrides;
}