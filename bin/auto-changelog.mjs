#!/usr/bin/env node

import { run } from '../src/run.mjs';

run(process.argv).catch((error) => {
	console.error('\n');
	console.error(error);
	process.exit(1);
});
