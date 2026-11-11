#!/usr/bin/env node

'use strict';

const { run } = require('../src/run');

run(process.argv).catch((error) => {
	console.error('\n');
	console.error(error);
	process.exit(1);
});
