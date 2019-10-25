"use strict";

require("core-js/modules/es.symbol");

require("core-js/modules/es.symbol.description");

require("core-js/modules/es.symbol.iterator");

require("core-js/modules/es.array.concat");

require("core-js/modules/es.array.from");

require("core-js/modules/es.array.is-array");

require("core-js/modules/es.array.iterator");

require("core-js/modules/es.array.join");

require("core-js/modules/es.array.reduce");

require("core-js/modules/es.array.slice");

require("core-js/modules/es.array.splice");

require("core-js/modules/es.date.to-string");

require("core-js/modules/es.object.define-property");

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

require("core-js/modules/web.dom-collections.iterator");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.updateLog = updateLog;
exports.formatBytes = formatBytes;
exports.cmd = cmd;
exports.getGitVersion = getGitVersion;
exports.niceDate = niceDate;
exports.isLink = isLink;
exports.parseLimit = parseLimit;
exports.replaceText = replaceText;
exports.readFile = readFile;
exports.writeFile = writeFile;
exports.appendFile = appendFile;
exports.fileExists = fileExists;
exports.readJson = readJson;

require("regenerator-runtime/runtime");

var _readline = _interopRequireDefault(require("readline"));

var _fs = _interopRequireDefault(require("fs"));

var _os = _interopRequireDefault(require("os"));

var _child_process = require("child_process");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _toArray(arr) { return _arrayWithHoles(arr) || _iterableToArray(arr) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function updateLog(string) {
  var clearLine = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

  if (clearLine) {
    _readline["default"].clearLine(process.stdout);

    _readline["default"].cursorTo(process.stdout, 0);
  }

  process.stdout.write("auto-changelog: ".concat(string));
}

function formatBytes(bytes) {
  return "".concat(Math.max(1, Math.round(bytes / 1024)), " kB");
} // Simple util for calling a child process


function cmd(string, onProgress) {
  var _string$trim$split = string.trim().split(' '),
      _string$trim$split2 = _toArray(_string$trim$split),
      cmd = _string$trim$split2[0],
      args = _string$trim$split2.slice(1);

  return new Promise(function (resolve, reject) {
    var child = (0, _child_process.spawn)(cmd, args);
    var data = '';
    child.stdout.on('data', function (buffer) {
      data += buffer.toString();

      if (onProgress) {
        onProgress(data.length);
      }
    });
    child.stdout.on('end', function () {
      return resolve(data);
    });
    child.on('error', reject);
  });
}

function getGitVersion() {
  return _getGitVersion.apply(this, arguments);
}

function _getGitVersion() {
  _getGitVersion = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee() {
    var output, match;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return cmd('git --version');

          case 2:
            output = _context.sent;
            match = output.match(/\d+\.\d+\.\d+/);
            return _context.abrupt("return", match ? match[0] : null);

          case 5:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _getGitVersion.apply(this, arguments);
}

function niceDate(string) {
  var date = new Date(string);
  var day = date.getUTCDate();
  var month = MONTH_NAMES[date.getUTCMonth()];
  var year = date.getUTCFullYear();
  return "".concat(day, " ").concat(month, " ").concat(year);
}

function isLink(string) {
  return /^http/.test(string);
}

function parseLimit(limit) {
  return limit === 'false' ? false : parseInt(limit, 10);
}

function replaceText(string, options) {
  if (!options.replaceText) {
    return string;
  }

  return Object.keys(options.replaceText).reduce(function (string, pattern) {
    return string.replace(new RegExp(pattern, 'g'), options.replaceText[pattern]);
  }, string);
}

var createCallback = function createCallback(resolve, reject) {
  return function (err, data) {
    if (err) reject(err);else resolve(data);
  };
};

function readFile(path) {
  return new Promise(function (resolve, reject) {
    _fs["default"].readFile(path, 'utf-8', createCallback(resolve, reject));
  });
}

function writeFile(path, data) {
  return new Promise(function (resolve, reject) {
    _fs["default"].writeFile(path, data, createCallback(resolve, reject));
  });
}

function appendFile(_x, _x2) {
  return _appendFile.apply(this, arguments);
}

function _appendFile() {
  _appendFile = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee2(path, data) {
    var content, appended, text;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return readFile(path);

          case 2:
            content = _context2.sent;
            appended = content.toString().split(_os["default"].EOL);
            appended.splice(0, 0, data);
            text = appended.join(_os["default"].EOL);
            return _context2.abrupt("return", writeFile(path, text));

          case 7:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _appendFile.apply(this, arguments);
}

function fileExists(path) {
  return new Promise(function (resolve) {
    _fs["default"].access(path, function (err) {
      return resolve(!err);
    });
  });
}

function readJson(_x3) {
  return _readJson.apply(this, arguments);
}

function _readJson() {
  _readJson = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee3(path) {
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return fileExists(path);

          case 2:
            _context3.t0 = _context3.sent;

            if (!(_context3.t0 === false)) {
              _context3.next = 5;
              break;
            }

            return _context3.abrupt("return", null);

          case 5:
            _context3.t1 = JSON;
            _context3.next = 8;
            return readFile(path);

          case 8:
            _context3.t2 = _context3.sent;
            return _context3.abrupt("return", _context3.t1.parse.call(_context3.t1, _context3.t2));

          case 10:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  }));
  return _readJson.apply(this, arguments);
}