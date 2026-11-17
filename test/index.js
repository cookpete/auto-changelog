'use strict';

const test = require('tape');
const { execFileSync } = require('child_process');
const { join } = require('path');
const { version } = require('../package.json');
const { run } = require('../src/run');
const api = require('auto-changelog');

test('package entry point: exports `run`, without running the CLI', (t) => {
	t.deepEqual(Object.keys(api), ['run'], 'exports only `run`');
	t.equal(api.run, run, '`run` is the same function `./src/run` exports');
	t.end();
});

test('bin: runs the CLI', (t) => {
	const output = execFileSync(process.execPath, [join(__dirname, '..', 'bin', 'auto-changelog.js'), '--version'], { encoding: 'utf8' });
	t.equal(output.trim(), `v${version}`);
	t.end();
});

test('package exports: only the entry point and package.json', (t) => {
	t.equal(require.resolve('auto-changelog/package.json'), join(__dirname, '..', 'package.json'), 'package.json');
	for (const specifier of ['auto-changelog/src', 'auto-changelog/src/run', 'auto-changelog/src/utils.js', 'auto-changelog/package']) {
		t.throws(() => require.resolve(specifier), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' }, `${specifier} is not exported`);
	}
	t.end();
});
