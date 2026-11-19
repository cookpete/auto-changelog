import test from 'tape';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { createRequire } from 'module';
import { run } from '../src/run.mjs';
import * as esm from 'auto-changelog';

// CommonJS consumers must still be able to `require` the package
const require = createRequire(import.meta.url);
const { version } = require('../package.json');
const api = require('auto-changelog');

test('package entry point: exports `run`, without running the CLI', (t) => {
	t.deepEqual(Object.keys(api), ['run'], 'exports only `run`');
	t.equal(api.run, run, '`run` is the same function `./src/run` exports');
	t.end();
});

test('package entry point: can be imported', (t) => {
	t.deepEqual(Object.keys(esm), ['run'], 'exports only `run`');
	t.equal(esm.run, run, '`run` is the same function `./src/run` exports');
	t.end();
});

test('bin: runs the CLI', (t) => {
	const output = execFileSync(process.execPath, [join(import.meta.dirname, '..', 'bin', 'auto-changelog.mjs'), '--version'], { encoding: 'utf8' });
	t.equal(output.trim(), `v${version}`);
	t.end();
});

test('package exports: only the entry point and package.json', (t) => {
	t.equal(require.resolve('auto-changelog/package.json'), join(import.meta.dirname, '..', 'package.json'), 'package.json');
	for (const specifier of ['auto-changelog/src', 'auto-changelog/src/run', 'auto-changelog/src/utils.mjs', 'auto-changelog/package']) {
		t.throws(() => require.resolve(specifier), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' }, `${specifier} is not exported`);
	}
	t.end();
});
