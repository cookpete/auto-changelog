'use strict';

const test = require('tape');
const {
	updateLog,
	cmd,
	niceDate,
	isLink,
	readFile,
	writeFile,
	fileExists,
	readJson,
} = require('../src/utils');

test('updateLog: doesn\'t error', (t) => {
	updateLog('Test', false);
	updateLog('Test');
	t.pass('did not error');
	t.end();
});

test('updateLog: writes to stderr, not stdout', (t) => {
	const stdout = t.capture(process.stdout, 'write');
	const stderr = t.capture(process.stderr, 'write');
	updateLog('Test');
	stdout.restore?.();
	stderr.restore?.();
	t.deepEqual(stdout(), [], 'nothing on stdout');
	t.ok(stderr().some((call) => call.args[0] === 'auto-changelog: Test'), 'the message is on stderr');
	t.end();
});

test('updateLog: clears the line only on a terminal', (t) => {
	const { isTTY } = process.stderr;
	const writes = [];
	const stderr = t.capture(process.stderr, 'write', (chunk) => {
		writes.push(chunk);
		return true;
	});
	try {
		process.stderr.isTTY = false;
		updateLog('Piped');
		t.deepEqual(writes, ['auto-changelog: Piped'], 'no escape codes when piped');

		writes.length = 0;
		process.stderr.isTTY = true;
		updateLog('Shown');
		t.equal(writes[writes.length - 1], 'auto-changelog: Shown', 'the message');
		t.ok(writes.length > 1, 'after clearing the line on a terminal');
	} finally {
		process.stderr.isTTY = isTTY;
		stderr.restore?.();
	}
	t.end();
});

test('cmd: runs a command', async (t) => {
	const result = await cmd('node --version');
	t.equal(typeof result, 'string');
});

test('cmd: runs onProgress', async (t) => {
	const result = await cmd('node --version', (bytes) => t.equal(typeof bytes, 'number'));
	t.equal(typeof result, 'string');
});

test('cmd: separates arguments by any whitespace', async (t) => {
	t.equal(await cmd('  node   -p\t1+1 '), '2\n');
});

test('cmd: rejects when the command fails, with what it wrote to stderr', async (t) => {
	try {
		await cmd('node -e process.stderr.write("broken");process.exit(2)');
		t.fail('should reject');
	} catch (error) {
		t.equal(error.message, '`node -e process.stderr.write("broken");process.exit(2)` failed: broken');
	}
	try {
		await cmd('node -e process.exit(3)');
		t.fail('should reject');
	} catch (error) {
		t.equal(error.message, '`node -e process.exit(3)` failed with exit code 3', 'or its exit code, when stderr is empty');
	}
	try {
		await cmd('auto-changelog-no-such-command');
		t.fail('should reject');
	} catch (error) {
		t.equal(error.code, 'ENOENT', 'a missing command');
	}
});

test('niceDate: formats string into nice date', (t) => {
	t.match(niceDate('2015-10-03'), /^\d October 2015$/);
	t.match(niceDate('2017-11-07T19:19:02.635Z'), /^\d November 2017$/);
	t.end();
});

test('niceDate: formats date into nice date', (t) => {
	t.match(niceDate(new Date(2016, 8, 2)), /^\d September 2016$/);
	t.match(niceDate(new Date('2015-10-03')), /^\d October 2015$/);
	t.end();
});

test('isLink: returns true for links', (t) => {
	t.equal(isLink('http://test.com'), true);
	t.end();
});

test('isLink: returns false for non-links', (t) => {
	t.equal(isLink('not a link'), false);
	t.end();
});

test('readFile: reads file', async (t) => {
	t.equal(await readFile(null, { fs: { readFile: (path, type, cb) => cb(null, 'abc') } }), 'abc');
});

test('writeFile: reads file', async (t) => {
	t.equal(await writeFile(null, null, { fs: { writeFile: (path, data, cb) => cb(null, 'abc') } }), 'abc');
});

test('fileExists: reads file', async (t) => {
	t.equal(await fileExists(null, { fs: { access: (path, cb) => cb(null) } }), true);
});

test('readJson: reads file', async (t) => {
	const fs = {
		readFile: (path, type, cb) => cb(null, '{"abc":123}'),
		access: (path, cb) => cb(null),
	};
	t.deepEqual(await readJson(null, { fs }), { abc: 123 });
});

test('readJson: names the file when its JSON is invalid', async (t) => {
	const fs = {
		readFile: (path, type, cb) => cb(null, '{\n  version: "1.0.0"\n}'),
		access: (path, cb) => cb(null),
	};
	await readJson('package.json', { fs }).then(
		() => t.fail('should have thrown'),
		(e) => {
			t.ok(e instanceof SyntaxError, 'throws a SyntaxError');
			t.match(e.message, /^Invalid JSON in package\.json: /, 'names the file');
			t.ok(e.cause instanceof SyntaxError, 'keeps the original error as `cause`');
		},
	);
});
