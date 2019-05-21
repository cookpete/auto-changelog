"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compileTemplate = compileTemplate;

var _path = require("path");

var _handlebars = _interopRequireDefault(require("handlebars"));

var _nodeFetch = _interopRequireDefault(require("node-fetch"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var TEMPLATES_DIR = (0, _path.join)(__dirname, '..', 'templates');
var MATCH_URL = /^https?:\/\/.+/;

_handlebars["default"].registerHelper('json', function (object) {
  return new _handlebars["default"].SafeString(JSON.stringify(object, null, 2));
});

_handlebars["default"].registerHelper('commit-list', function (context, options) {
  if (!context || context.length === 0) {
    return '';
  }

  var list = context.filter(function (commit) {
    if (options.hash.exclude) {
      var pattern = new RegExp(options.hash.exclude, 'm');

      if (pattern.test(commit.message)) {
        return false;
      }
    }

    if (options.hash.message) {
      var _pattern = new RegExp(options.hash.message, 'm');

      return _pattern.test(commit.message);
    }

    if (options.hash.subject) {
      var _pattern2 = new RegExp(options.hash.subject);

      return _pattern2.test(commit.subject);
    }

    return true;
  }).map(function (item) {
    return options.fn(item);
  }).join('');

  if (!list) {
    return '';
  }

  return "".concat(options.hash.heading, "\n\n").concat(list);
});

_handlebars["default"].registerHelper('matches', function (val, pattern, options) {
  var r = new RegExp(pattern, options.hash.flags || '');
  return r.test(val) ? options.fn(this) : options.inverse(this);
});

function getTemplate(_x) {
  return _getTemplate.apply(this, arguments);
}

function _getTemplate() {
  _getTemplate = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee(template) {
    var response, path;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (!MATCH_URL.test(template)) {
              _context.next = 5;
              break;
            }

            _context.next = 3;
            return (0, _nodeFetch["default"])(template);

          case 3:
            response = _context.sent;
            return _context.abrupt("return", response.text());

          case 5:
            _context.next = 7;
            return (0, _utils.fileExists)(template);

          case 7:
            if (!_context.sent) {
              _context.next = 9;
              break;
            }

            return _context.abrupt("return", (0, _utils.readFile)(template));

          case 9:
            path = (0, _path.join)(TEMPLATES_DIR, template + '.hbs');
            _context.next = 12;
            return (0, _utils.fileExists)(path);

          case 12:
            _context.t0 = _context.sent;

            if (!(_context.t0 === false)) {
              _context.next = 15;
              break;
            }

            throw new Error("Template '".concat(template, "' was not found"));

          case 15:
            return _context.abrupt("return", (0, _utils.readFile)(path));

          case 16:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _getTemplate.apply(this, arguments);
}

function cleanTemplate(template) {
  return template // Remove indentation
  .replace(/\n +/g, '\n').replace(/^ +/, '') // Fix multiple blank lines
  .replace(/\n\n\n+/g, '\n\n').replace(/\n\n$/, '\n');
}

function compileTemplate(_x2, _x3) {
  return _compileTemplate.apply(this, arguments);
}

function _compileTemplate() {
  _compileTemplate = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee2(_ref, data) {
    var template, handlebarsSetup, setup, compile;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            template = _ref.template, handlebarsSetup = _ref.handlebarsSetup;

            if (handlebarsSetup) {
              setup = require((0, _path.join)(process.cwd(), handlebarsSetup));

              if (typeof setup === 'function') {
                setup(_handlebars["default"]);
              }
            }

            _context2.t0 = _handlebars["default"];
            _context2.next = 5;
            return getTemplate(template);

          case 5:
            _context2.t1 = _context2.sent;
            compile = _context2.t0.compile.call(_context2.t0, _context2.t1);

            if (!(template === 'json')) {
              _context2.next = 9;
              break;
            }

            return _context2.abrupt("return", compile(data));

          case 9:
            return _context2.abrupt("return", cleanTemplate(compile(data)));

          case 10:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _compileTemplate.apply(this, arguments);
}