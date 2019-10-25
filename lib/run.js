"use strict";

require("core-js/modules/es.symbol");

require("core-js/modules/es.symbol.description");

require("core-js/modules/es.symbol.iterator");

require("core-js/modules/es.array.concat");

require("core-js/modules/es.array.filter");

require("core-js/modules/es.array.for-each");

require("core-js/modules/es.array.from");

require("core-js/modules/es.array.is-array");

require("core-js/modules/es.array.iterator");

require("core-js/modules/es.array.some");

require("core-js/modules/es.array.sort");

require("core-js/modules/es.date.to-string");

require("core-js/modules/es.object.define-properties");

require("core-js/modules/es.object.define-property");

require("core-js/modules/es.object.get-own-property-descriptor");

require("core-js/modules/es.object.get-own-property-descriptors");

require("core-js/modules/es.object.keys");

require("core-js/modules/es.object.to-string");

require("core-js/modules/es.promise");

require("core-js/modules/es.regexp.exec");

require("core-js/modules/es.regexp.to-string");

require("core-js/modules/es.string.iterator");

require("core-js/modules/es.string.split");

require("core-js/modules/web.dom-collections.for-each");

require("core-js/modules/web.dom-collections.iterator");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = run;

require("regenerator-runtime/runtime");

var _commander = require("commander");

var _semver = _interopRequireDefault(require("semver"));

var _lodash = _interopRequireDefault(require("lodash.uniqby"));

var _package = require("../package.json");

var _remote = require("./remote");

var _commits2 = require("./commits");

var _releases = require("./releases");

var _template = require("./template");

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var DEFAULT_OPTIONS = {
  output: 'CHANGELOG.md',
  template: 'compact',
  remote: 'origin',
  commitLimit: 3,
  backfillLimit: 3,
  tagPrefix: '',
  sortCommits: 'relevance',
  appendGitLog: '',
  config: '.auto-changelog',
  tagLimit: 0
};
var PACKAGE_FILE = 'package.json';
var PACKAGE_OPTIONS_KEY = 'auto-changelog';

function getOptions(_x) {
  return _getOptions.apply(this, arguments);
}

function _getOptions() {
  _getOptions = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee(argv) {
    var options, pkg, packageOptions, dotOptions;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            options = new _commander.Command().option('-o, --output <file>', "output file, default: ".concat(DEFAULT_OPTIONS.output)).option('-c, --config <file>', "config file location, default: ".concat(DEFAULT_OPTIONS.config)).option('-t, --template <template>', "specify template to use [compact, keepachangelog, json], default: ".concat(DEFAULT_OPTIONS.template)).option('-r, --remote <remote>', "specify git remote to use for links, default: ".concat(DEFAULT_OPTIONS.remote)).option('-p, --package [file]', 'use version from file as latest release, default: package.json').option('-v, --latest-version <version>', 'use specified version as latest release').option('-u, --unreleased', 'include section for unreleased changes').option('-l, --commit-limit <count>', "number of commits to display per release, default: ".concat(DEFAULT_OPTIONS.commitLimit), _utils.parseLimit).option('-b, --backfill-limit <count>', "number of commits to backfill empty releases with, default: ".concat(DEFAULT_OPTIONS.backfillLimit), _utils.parseLimit).option('--commit-url <url>', 'override url for commits, use {id} for commit id').option('--issue-url, -i <url>', 'override url for issues, use {id} for issue id') // -i kept for back compatibility
            .option('--merge-url <url>', 'override url for merges, use {id} for merge id').option('--compare-url <url>', 'override url for compares, use {from} and {to} for tags').option('--issue-pattern <regex>', 'override regex pattern for issues in commit messages').option('--breaking-pattern <regex>', 'regex pattern for breaking change commits').option('--merge-pattern <regex>', 'add custom regex pattern for merge commits').option('--ignore-commit-pattern <regex>', 'pattern to ignore when parsing commits').option('--tag-pattern <regex>', 'override regex pattern for release tags').option('--tag-prefix <prefix>', 'prefix used in version tags').option('--starting-commit <hash>', 'starting commit to use for changelog generation').option('--sort-commits <property>', "sort commits by property [relevance, date, date-desc], default: ".concat(DEFAULT_OPTIONS.sortCommits)).option('--include-branch <branch>', 'one or more branches to include commits from, comma separated', function (str) {
              return str.split(',');
            }).option('--release-summary', 'use tagged commit message body as release summary').option('--handlebars-setup <file>', 'handlebars setup file').option('--append-git-log <string>', 'string to append to git log command').option('--stdout', 'output changelog to stdout').option('--prepend-output', 'Prepend output to file').option('--tag-limit <count>', 'Max realease to return, default: 0 = unlimited', _utils.parseLimit).version(_package.version).parse(argv);
            _context.next = 3;
            return (0, _utils.readJson)(PACKAGE_FILE);

          case 3:
            pkg = _context.sent;
            packageOptions = pkg ? pkg[PACKAGE_OPTIONS_KEY] : null;
            _context.next = 7;
            return (0, _utils.readJson)(options.config || DEFAULT_OPTIONS.config);

          case 7:
            dotOptions = _context.sent;
            return _context.abrupt("return", _objectSpread({}, DEFAULT_OPTIONS, {}, dotOptions, {}, packageOptions, {}, options));

          case 9:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _getOptions.apply(this, arguments);
}

function getLatestVersion(_x2, _x3) {
  return _getLatestVersion.apply(this, arguments);
}

function _getLatestVersion() {
  _getLatestVersion = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee2(options, commits) {
    var file, _ref, _version, prefix;

    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            if (!options.latestVersion) {
              _context2.next = 4;
              break;
            }

            if (_semver["default"].valid(options.latestVersion)) {
              _context2.next = 3;
              break;
            }

            throw new Error('--latest-version must be a valid semver version');

          case 3:
            return _context2.abrupt("return", options.latestVersion);

          case 4:
            if (!options["package"]) {
              _context2.next = 17;
              break;
            }

            file = options["package"] === true ? PACKAGE_FILE : options["package"];
            _context2.next = 8;
            return (0, _utils.fileExists)(file);

          case 8:
            _context2.t0 = _context2.sent;

            if (!(_context2.t0 === false)) {
              _context2.next = 11;
              break;
            }

            throw new Error("File ".concat(file, " does not exist"));

          case 11:
            _context2.next = 13;
            return (0, _utils.readJson)(file);

          case 13:
            _ref = _context2.sent;
            _version = _ref.version;
            prefix = commits.some(function (c) {
              return /^v/.test(c.tag);
            }) ? 'v' : '';
            return _context2.abrupt("return", "".concat(prefix).concat(_version));

          case 17:
            return _context2.abrupt("return", null);

          case 18:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _getLatestVersion.apply(this, arguments);
}

function getReleases(_x4, _x5, _x6, _x7) {
  return _getReleases.apply(this, arguments);
}

function _getReleases() {
  _getReleases = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee3(commits, remote, latestVersion, options) {
    var releases, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, branch, _commits;

    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            releases = (0, _releases.parseReleases)(commits, remote, latestVersion, options);

            if (!options.includeBranch) {
              _context3.next = 30;
              break;
            }

            _iteratorNormalCompletion = true;
            _didIteratorError = false;
            _iteratorError = undefined;
            _context3.prev = 5;
            _iterator = options.includeBranch[Symbol.iterator]();

          case 7:
            if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
              _context3.next = 16;
              break;
            }

            branch = _step.value;
            _context3.next = 11;
            return (0, _commits2.fetchCommits)(remote, options, branch);

          case 11:
            _commits = _context3.sent;
            releases = [].concat(_toConsumableArray(releases), _toConsumableArray((0, _releases.parseReleases)(_commits, remote, latestVersion, options)));

          case 13:
            _iteratorNormalCompletion = true;
            _context3.next = 7;
            break;

          case 16:
            _context3.next = 22;
            break;

          case 18:
            _context3.prev = 18;
            _context3.t0 = _context3["catch"](5);
            _didIteratorError = true;
            _iteratorError = _context3.t0;

          case 22:
            _context3.prev = 22;
            _context3.prev = 23;

            if (!_iteratorNormalCompletion && _iterator["return"] != null) {
              _iterator["return"]();
            }

          case 25:
            _context3.prev = 25;

            if (!_didIteratorError) {
              _context3.next = 28;
              break;
            }

            throw _iteratorError;

          case 28:
            return _context3.finish(25);

          case 29:
            return _context3.finish(22);

          case 30:
            return _context3.abrupt("return", (0, _lodash["default"])(releases, 'tag').sort(_releases.sortReleases));

          case 31:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3, null, [[5, 18, 22, 30], [23,, 25, 29]]);
  }));
  return _getReleases.apply(this, arguments);
}

function run(_x8) {
  return _run.apply(this, arguments);
}

function _run() {
  _run = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee4(argv) {
    var options, log, remote, commitProgress, commits, latestVersion, releases, changelog, bytes;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return getOptions(argv);

          case 2:
            options = _context4.sent;

            log = function log(string) {
              return options.stdout ? null : (0, _utils.updateLog)(string);
            };

            log('Fetching remote…');
            _context4.next = 7;
            return (0, _remote.fetchRemote)(options);

          case 7:
            remote = _context4.sent;

            commitProgress = function commitProgress(bytes) {
              return log("Fetching commits\u2026 ".concat((0, _utils.formatBytes)(bytes), " loaded"));
            };

            _context4.next = 11;
            return (0, _commits2.fetchCommits)(remote, options, null, commitProgress);

          case 11:
            commits = _context4.sent;
            log('Generating changelog…');
            _context4.next = 15;
            return getLatestVersion(options, commits);

          case 15:
            latestVersion = _context4.sent;
            _context4.next = 18;
            return getReleases(commits, remote, latestVersion, options);

          case 18:
            releases = _context4.sent;
            _context4.next = 21;
            return (0, _template.compileTemplate)(options, {
              releases: releases
            });

          case 21:
            changelog = _context4.sent;

            if (!options.stdout) {
              _context4.next = 26;
              break;
            }

            process.stdout.write(changelog);
            _context4.next = 37;
            break;

          case 26:
            if (!options.prependOutput) {
              _context4.next = 35;
              break;
            }

            _context4.next = 29;
            return (0, _utils.fileExists)(options.output);

          case 29:
            if (_context4.sent) {
              _context4.next = 31;
              break;
            }

            throw new Error("File ".concat(options.output, " does not exist"));

          case 31:
            _context4.next = 33;
            return (0, _utils.appendFile)(options.output, changelog);

          case 33:
            _context4.next = 37;
            break;

          case 35:
            _context4.next = 37;
            return (0, _utils.writeFile)(options.output, changelog);

          case 37:
            bytes = Buffer.byteLength(changelog, 'utf8');
            log("".concat((0, _utils.formatBytes)(bytes), " written to ").concat(options.output, "\n"));

          case 39:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  }));
  return _run.apply(this, arguments);
}