#!/usr/bin/env node
"use strict";

require("@babel/polyfill");

var _run = _interopRequireDefault(require("./run"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

(0, _run["default"])(process.argv)["catch"](function (error) {
  console.log('\n');
  console.error(error);
  process.exit(1);
});