'use strict';

const test = require('tape');
const { dirname, join } = require('path');
const {
	mkdirSync,
	mkdtempSync,
	realpathSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} = require('fs');
const { tmpdir } = require('os');
const { execFileSync } = require('child_process');
const resolveConfig = require('../src/extends');
const getOptions = require('../src/options');
const remotes = require('./data/remotes');

async function inTempDir(files, fn, { git = true } = {}) {
	const original = process.cwd();
	const outer = realpathSync(mkdtempSync(join(tmpdir(), 'auto-changelog-')));
	const repo = join(outer, 'repo');
	mkdirSync(repo);
	if (git) {
		execFileSync('git', ['init', '-q'], { cwd: repo });
	}
	for (const [path, contents] of Object.entries(files)) {
		mkdirSync(dirname(join(outer, path)), { recursive: true });
		writeFileSync(join(outer, path), typeof contents === 'string' ? contents : JSON.stringify(contents));
	}
	try {
		process.chdir(repo);
		return await fn({ outer, repo });
	} finally {
		process.chdir(original);
		rmSync(outer, { recursive: true, force: true });
	}
}

function rejects(t, promise, pattern, message) {
	return promise.then(
		() => t.fail(`${message}: should throw`),
		(error) => t.match(error.message, pattern, message),
	);
}

test('resolveConfig: without `extends`, returns the config', async (t) => {
	const config = { template: 'compact', replaceText: { a: 'b' } };
	t.deepEqual(await resolveConfig(config, process.cwd(), []), config);
});

test('resolveConfig: without `extends`, a `null` replaceText pattern throws', async (t) => {
	await rejects(t, resolveConfig({ replaceText: { a: null } }, process.cwd(), []), /sets `a` to `null`, but no extended config defines that pattern/, 'nothing to remove');
});

test('resolveConfig: without `extends`, does not check for command-line-only options', async (t) => {
	t.deepEqual(await resolveConfig({ config: 'x' }, process.cwd(), [[{ config: 'x' }, 'file']]), { config: 'x' });
});

test('resolveConfig: extends a relative path, with the extending config taking precedence', async (t) => {
	await inTempDir({ 'repo/base.json': { template: 'keepachangelog', unreleased: true } }, async ({ repo }) => {
		t.deepEqual(
			await resolveConfig({ extends: './base.json', template: 'compact' }, repo, []),
			{ template: 'compact', unreleased: true },
		);
	});
});

test('resolveConfig: extends a JSON file from a package, with require-style resolution', async (t) => {
	await inTempDir({
		'repo/node_modules/shared/package.json': { name: 'shared' },
		'repo/node_modules/shared/auto-changelog.json': { commitLimit: 5 },
	}, async ({ repo }) => {
		t.deepEqual(await resolveConfig({ extends: 'shared/auto-changelog.json' }, repo, []), { commitLimit: 5 }, 'package subpath');
		t.deepEqual(await resolveConfig({ extends: 'shared/auto-changelog' }, repo, []), { commitLimit: 5 }, 'infers the .json extension');
	});
});

test('resolveConfig: nested `extends` resolve from the extending file, and may leave the extending directory', async (t) => {
	await inTempDir({
		'repo/shared/base.json': { extends: './root.json', template: 'keepachangelog' },
		'repo/shared/root.json': { template: 'json', unreleased: true },
		'repo/packages/a/placeholder': '',
	}, async ({ repo }) => {
		t.deepEqual(
			await resolveConfig({ extends: '../../shared/base.json' }, join(repo, 'packages', 'a'), []),
			{ template: 'keepachangelog', unreleased: true },
		);
	});
});

test('resolveConfig: merges replaceText maps, and `null` removes an inherited pattern', async (t) => {
	await inTempDir({
		'repo/base.json': { replaceText: { one: '1', two: '2', three: '3' } },
		'repo/string.json': { replaceText: 'not an object' },
	}, async ({ repo }) => {
		const { replaceText } = await resolveConfig({ extends: './base.json', replaceText: { two: 'II', three: null, four: '4' } }, repo, []);
		t.deepEqual(replaceText, { one: '1', two: 'II', four: '4' });
		t.deepEqual(Object.keys(replaceText), ['one', 'two', 'four'], 'an overridden pattern keeps its inherited position');

		await rejects(t, resolveConfig({ extends: './base.json', replaceText: { five: null } }, repo, []), /sets `five` to `null`/, 'removing a pattern nothing defines');
		t.deepEqual(
			(await resolveConfig({ extends: './string.json', replaceText: { a: 'b' } }, repo, [])).replaceText,
			{ a: 'b' },
			'a non-object inherited replaceText is replaced',
		);
		t.deepEqual(
			(await resolveConfig({ extends: './base.json', replaceText: 'x' }, repo, [])).replaceText,
			'x',
			'a non-object replaceText replaces the inherited one',
		);
	});
});

test('resolveConfig: rejects a cycle', async (t) => {
	await inTempDir({
		'repo/a.json': { extends: './b.json' },
		'repo/b.json': { extends: './a.json' },
	}, async ({ repo }) => {
		await rejects(t, resolveConfig({ extends: './a.json' }, repo, []), /form a cycle: .*a\.json -> .*b\.json -> .*a\.json/, 'cycle');
	});
});

test('resolveConfig: rejects targets that are missing, not JSON, or not a JSON object', async (t) => {
	await inTempDir({
		'repo/code.js': 'module.exports = {};',
		'repo/array.json': [],
	}, async ({ repo }) => {
		await rejects(t, resolveConfig({ extends: './missing.json' }, repo, []), /could not be found/, 'missing');
		await rejects(t, resolveConfig({ extends: './code.js' }, repo, []), /not a JSON file/, 'JavaScript is never loaded');
		await rejects(t, resolveConfig({ extends: './array.json' }, repo, []), /must contain a JSON object/, 'array');
	});
});

test('resolveConfig: rejects targets outside the repository', async (t) => {
	await inTempDir({ 'outside.json': { template: 'json' } }, async ({ outer, repo }) => {
		symlinkSync(join(outer, 'outside.json'), join(repo, 'link.json'));
		await rejects(t, resolveConfig({ extends: '../outside.json' }, repo, []), /outside the repository/, 'relative path');
		await rejects(t, resolveConfig({ extends: join(outer, 'outside.json') }, repo, []), /outside the repository/, 'absolute path');
		await rejects(t, resolveConfig({ extends: './link.json' }, repo, []), /outside the repository/, 'symlink');
	});
});

test('resolveConfig: outside a git repository, the current directory is the boundary', async (t) => {
	await inTempDir({
		'repo/base.json': { template: 'json' },
		'outside.json': { template: 'json' },
	}, async ({ repo }) => {
		t.deepEqual(await resolveConfig({ extends: './base.json' }, repo, []), { template: 'json' });
		await rejects(t, resolveConfig({ extends: '../outside.json' }, repo, []), /outside the repository/, 'still bounded');
	}, { git: false });
});

test('resolveConfig: `extends` must be a non-empty string', async (t) => {
	await rejects(t, resolveConfig({ extends: '' }, process.cwd(), []), /must be a non-empty string/, 'empty');
	await rejects(t, resolveConfig({ extends: ['./a.json'] }, process.cwd(), []), /must be a non-empty string/, 'array');
});

test('resolveConfig: with `extends`, rejects options that only apply on the command line', async (t) => {
	await inTempDir({ 'repo/base.json': { unsafeConfig: true, help: true } }, async ({ repo }) => {
		await rejects(t, resolveConfig({ extends: './base.json' }, repo, []), /base\.json sets `help`, `unsafeConfig`, which only apply on the command line/, 'in an extended config');
		await rejects(
			t,
			resolveConfig({ extends: './base.json' }, repo, [[null, 'missing'], [{ config: 'x', extends: './base.json' }, '.auto-changelog']]),
			/\.auto-changelog sets `config`/,
			'in the extending config',
		);
	});
});

test('getOptions: `extends` in .auto-changelog resolves from the config file', async (t) => {
	await inTempDir({ 'repo/configs/base.json': { template: 'keepachangelog' } }, async () => {
		function readJson(file) {
			return file === 'configs/.auto-changelog' ? { extends: './base.json' } : null;
		}
		const options = await getOptions(['', '', '--config', 'configs/.auto-changelog'], { readJson, fetchRemote: () => remotes.github });
		t.equal(options.template, 'keepachangelog');
	});
});

test('getOptions: --extends takes precedence over config, and resolves from the current directory', async (t) => {
	await inTempDir({
		'repo/cli.json': { template: 'json' },
		'repo/pkg.json': { template: 'keepachangelog', commitLimit: 7 },
	}, async () => {
		function readJson(file) {
			return file === 'package.json' ? { 'auto-changelog': { extends: './pkg.json', unreleased: true } } : null;
		}
		const fromPackage = await getOptions(['', ''], { readJson, fetchRemote: () => remotes.github });
		t.equal(fromPackage.template, 'keepachangelog', 'package.json key');
		t.equal(fromPackage.commitLimit, 7);
		t.equal(fromPackage.unreleased, true, 'own options are kept');

		const fromCli = await getOptions(['', '', '--extends', './cli.json'], { readJson, fetchRemote: () => remotes.github });
		t.equal(fromCli.template, 'json', 'command line');
		t.equal(fromCli.commitLimit, 3, 'the package.json key\'s extends is replaced');
	});
});

test('getOptions: an extended config is held to the in-repo config safety checks', async (t) => {
	await inTempDir({ 'repo/base.json': { plugins: ['x'] } }, async () => {
		await rejects(
			t,
			getOptions(['', '', '--extends', './base.json'], { readJson: () => null, fetchRemote: () => remotes.github }),
			/Refusing to run: .*"plugins" loads code/,
			'even when named on the command line',
		);
	});
});
