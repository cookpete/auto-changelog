"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fetchRemote = fetchRemote;

var _parseGithubUrl = _interopRequireDefault(require("parse-github-url"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function fetchRemote(_x) {
  return _fetchRemote.apply(this, arguments);
}

function _fetchRemote() {
  _fetchRemote = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee(name) {
    var remoteURL, remote, protocol, hostname;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return (0, _utils.cmd)("git config --get remote.".concat(name, ".url"));

          case 2:
            remoteURL = _context.sent;

            if (remoteURL) {
              _context.next = 7;
              break;
            }

            console.warn("Warning: Git remote ".concat(name, " was not found"));
            console.warn("Warning: Changelog will not contain links to commits, issues, or PRs");
            return _context.abrupt("return", null);

          case 7:
            remote = (0, _parseGithubUrl["default"])(remoteURL);
            protocol = remote.protocol === 'http:' ? 'http:' : 'https:';
            hostname = remote.hostname || remote.host;

            if (!(/gitlab/.test(hostname) && /\.git$/.test(remote.branch))) {
              _context.next = 12;
              break;
            }

            return _context.abrupt("return", {
              hostname: hostname,
              url: "".concat(protocol, "//").concat(hostname, "/").concat(remote.repo, "/").concat(remote.branch.replace(/\.git$/, ''))
            });

          case 12:
            if (!/dev\.azure/.test(hostname)) {
              _context.next = 14;
              break;
            }

            return _context.abrupt("return", {
              hostname: hostname,
              url: "".concat(protocol, "//").concat(hostname, "/").concat(remote.path),
              projectUrl: "".concat(protocol, "//").concat(hostname, "/").concat(remote.repo)
            });

          case 14:
            if (!/visualstudio/.test(hostname)) {
              _context.next = 16;
              break;
            }

            return _context.abrupt("return", {
              hostname: hostname,
              url: "".concat(protocol, "//").concat(hostname, "/").concat(remote.repo, "/").concat(remote.branch),
              projectUrl: "".concat(protocol, "//").concat(hostname, "/").concat(remote.owner)
            });

          case 16:
            return _context.abrupt("return", {
              hostname: hostname,
              url: "".concat(protocol, "//").concat(hostname, "/").concat(remote.repo)
            });

          case 17:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _fetchRemote.apply(this, arguments);
}