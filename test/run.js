'use strict';

const test = require('tape');
const { join } = require('path');
const { readFile } = require('../src/utils');
const remotes = require('./data/remotes');
const releases = require('./data/releases');
const { tags } = require('./data/commits-map');
const { run } = require('../src/run');
const getOptions = require('../src/options');

const { version } = require('../package.json');

const deps = {
	fileExists: () => false,
	readJson: () => null,
	fetchRemote: () => remotes.github,
	fetchTags: () => Promise.resolve(tags),
	parseReleases: () => Promise.resolve(releases),
	writeFile() {},
};

test('getOptions: parses commit limit correctly', async (t) => {
	const options = await getOptions(['', '', '--commit-limit', '10']);
	t.equal(options.commitLimit, 10);
});

// `help()` reports `--help`/`--version` through `console.log`, which is also how tape emits TAP,
// so the capture has to be restored before any assertion or its result line is swallowed.
function captureLog(t) {
	const capture = t.capture(console, 'log');
	return () => {
		capture.restore?.();
		return capture().map((call) => call.args.join(' '));
	};
}

async function rejectedWith(t, args) {
	const { exitCode } = process;
	const errors = t.capture(console, 'error');
	const logs = captureLog(t);
	const options = await getOptions(['', '', ...args], deps);
	logs();
	errors.restore?.();
	const failedWith = process.exitCode;
	process.exitCode = exitCode;
	t.equal(options, null, 'returns null so the caller stops');
	t.equal(failedWith, 1, 'sets a failing exit code');
	return errors().map((call) => call.args.join(' ')).join('\n');
}

test('getOptions: --commit-limit and --backfill-limit take only an integer', async (t) => {
	t.match(await rejectedWith(t, ['--commit-limit', 'false']), /Invalid integer value for option "commit-limit"/);
	t.match(await rejectedWith(t, ['--backfill-limit', 'false']), /Invalid integer value for option "backfill-limit"/);
	t.match(await rejectedWith(t, ['--commit-limit', '1.5']), /Invalid integer value for option "commit-limit"/);
});

test('getOptions: --commit-limit and --backfill-limit reject an empty value', async (t) => {
	t.match(await rejectedWith(t, ['--commit-limit=']), /Invalid integer value for option "commit-limit"/);
	t.match(await rejectedWith(t, ['--backfill-limit', ' ']), /Invalid integer value for option "backfill-limit"/);
});

test('getOptions: parses --issue-url correctly when given --issue-url', async (t) => {
	const options = await getOptions(['', '', '--issue-url', 'https://test.issue.local/issues/{id}']);
	t.equal(options.issueUrl, 'https://test.issue.local/issues/{id}');
});

test('getOptions: -i is not a short flag for --issue-url', async (t) => {
	t.match(await rejectedWith(t, ['-i', 'https://test.issue.local/issues/{id}']), /Unknown option '-i'/);
});

test('getOptions: -v is not a short flag for --latest-version', async (t) => {
	t.match(await rejectedWith(t, ['-v', '1.2.3']), /Unknown option '-v'/);
});

test('getOptions: --package takes no value', async (t) => {
	t.match(await rejectedWith(t, ['-p', '9.9.9']), /Unexpected argument '9.9.9'/);
	t.match(await rejectedWith(t, ['--package=package.json']), /Option '-p, --package' does not take an argument/);

	const options = await getOptions(['', '', '-pu'], {
		...deps,
		fileExists: () => true,
		readJson: (file) => (file === 'package.json' ? { version: '2.0.0' } : null),
	});
	t.equal(options.latestVersion, '2.0.0', '-p in a short cluster reads package.json');
	t.equal(options.unreleased, true, 'the rest of the cluster is its own flags');
});

test('getOptions: --package-file uses the version from that file', async (t) => {
	const options = await getOptions(['', '', '--package-file', 'test.json'], {
		...deps,
		fileExists: (file) => file === 'test.json',
		readJson: (file) => (file === 'test.json' ? { version: '3.1.4' } : null),
	});
	t.equal(options.latestVersion, '3.1.4');
});

test('getOptions: rejects a file path in the `package` config option', async (t) => {
	try {
		await getOptions(['', ''], {
			...deps,
			readJson: (file) => (file === 'package.json' ? { 'auto-changelog': { package: 'test.json' } } : null),
		});
		t.fail('should throw');
	} catch (error) {
		t.equal(error.name, 'TypeError');
		t.match(error.message, /use `packageFile`/);
	}
});

test('getOptions: autodetects a monorepo via repository.directory and derives the tag prefix', async (t) => {
	function readJson(file) {
		return file === 'package.json'
			? { name: 'my-package', repository: { directory: 'packages/my-package' }, 'auto-changelog': { autodetectMonorepoDisabled: false } }
			: null;
	}
	const options = await getOptions(['', ''], { readJson });
	t.equal(options.tagPrefix, 'my-package@');
	t.equal(options.stripTagPrefix, true);
});

test('getOptions: autodetects a monorepo via an ancestor workspaces field', async (t) => {
	function readJson(file) {
		if (file === 'package.json') { return { name: 'my-package', 'auto-changelog': { autodetectMonorepoDisabled: false } }; }
		if (file.endsWith('package.json')) { return { workspaces: ['packages/*'] }; }
		return null;
	}
	const options = await getOptions(['', ''], { readJson });
	t.equal(options.tagPrefix, 'my-package@');
	t.equal(options.stripTagPrefix, true);
});

test('getOptions: does not override an explicitly configured tag prefix', async (t) => {
	function readJson(file) {
		return file === 'package.json'
			? { name: 'my-package', repository: { directory: 'packages/my-package' }, 'auto-changelog': { autodetectMonorepoDisabled: false, tagPrefix: 'custom/' } }
			: null;
	}
	const options = await getOptions(['', ''], { readJson });
	t.equal(options.tagPrefix, 'custom/');
	t.equal(options.stripTagPrefix, true);
});

test('getOptions: does not autodetect when the package is not in a monorepo', async (t) => {
	function readJson(file) {
		return file === 'package.json'
			? { name: 'my-package', 'auto-changelog': { autodetectMonorepoDisabled: false } }
			: null;
	}
	const options = await getOptions(['', ''], { readJson });
	t.equal(options.tagPrefix, '');
	t.notOk(options.stripTagPrefix);
});

test('getOptions: does not autodetect a monorepo by default', async (t) => {
	function readJson(file) {
		return file === 'package.json'
			? { name: 'my-package', repository: { directory: 'packages/my-package' } }
			: null;
	}
	const options = await getOptions(['', ''], { readJson });
	t.equal(options.autodetectMonorepoDisabled, true);
	t.equal(options.tagPrefix, '');
	t.notOk(options.stripTagPrefix);
});

test('getOptions: --no-autodetect-monorepo-disabled enables autodetection', async (t) => {
	function readJson(file) {
		return file === 'package.json'
			? { name: 'my-package', repository: { directory: 'packages/my-package' } }
			: null;
	}
	const options = await getOptions(['', '', '--no-autodetect-monorepo-disabled'], { readJson });
	t.equal(options.autodetectMonorepoDisabled, false);
	t.equal(options.tagPrefix, 'my-package@');
	t.ok(options.stripTagPrefix);
});

test('getOptions: --autodetect-monorepo-disabled still disables autodetection', async (t) => {
	function readJson(file) {
		return file === 'package.json'
			? { name: 'my-package', repository: { directory: 'packages/my-package' }, 'auto-changelog': { autodetectMonorepoDisabled: false } }
			: null;
	}
	const options = await getOptions(['', '', '--autodetect-monorepo-disabled'], { readJson });
	t.equal(options.autodetectMonorepoDisabled, true);
	t.equal(options.tagPrefix, '');
	t.notOk(options.stripTagPrefix);
});

test('getOptions: neither flag leaves in-repo config in charge', async (t) => {
	function readJson(file) {
		return file === 'package.json'
			? { name: 'my-package', repository: { directory: 'packages/my-package' }, 'auto-changelog': { autodetectMonorepoDisabled: false } }
			: null;
	}
	const options = await getOptions(['', ''], { readJson });
	t.equal(options.autodetectMonorepoDisabled, false);
	t.equal(options.tagPrefix, 'my-package@');
});

test('run: generates a changelog', async (t) => {
	const expected = await readFile(join(__dirname, 'data', 'template-compact.md'));

	await run(['', ''], {
		...deps,
		writeFile(output, log) {
			t.equal(output, 'CHANGELOG.md');
			t.equal(log, expected);
		},
	});
});

const noRemote = require('./data/commits-no-remote');

test.skip('run: generates a changelog with no remote', async (t) => {
	const expected = await readFile(join(__dirname, 'data', 'template-compact-no-remote.md'));

	await run(['', ''], {
		...deps,
		fetchRemote: () => remotes.null,
		fetchCommits: () => noRemote,
		writeFile(output, log) {
			t.equal(output, 'CHANGELOG.md');
			t.equal(log, expected);
		},
	});
});

test('run: uses options from package.json', async (t) => {
	const expected = await readFile(join(__dirname, 'data', 'template-keepachangelog.md'));

	await run(['', ''], {
		...deps,
		fileExists: () => true,
		readJson: () => ({
			'auto-changelog': {
				template: 'keepachangelog',
			},
		}),
		writeFile(output, log) {
			t.equal(output, 'CHANGELOG.md');
			t.equal(log, expected);
		},
	});
});

test.skip('run: uses version from package.json', async (t) => {
	await run(['', '', '--package'], {
		...deps,
		fileExists: () => true,
		readJson: () => ({
			version: '2.0.0',
		}),
		writeFile(output, log) {
			t.ok(log.includes('v2.0.0'));
		},
	});
});

test.skip('run: uses version from custom package file', async (t) => {
	await run(['', '', '--package-file', 'test.json'], {
		...deps,
		fileExists: () => true,
		readJson(file) {
			if (file === 'test.json') {
				return { version: '2.0.0' };
			}
			return {};
		},
		writeFile(output, log) {
			t.ok(log.includes('v2.0.0'));
		},
	});
});

test.skip('run: uses version from package.json with no prefix', async (t) => {
	await run(['', '', '--package'], {
		...deps,
		fileExists: () => true,
		readJson: () => ({
			version: '2.0.0',
		}),
		fetchTags: () => Promise.resolve(tags.map((tag) => tag.replace('v', ''))),
		writeFile(output, log) {
			t.ok(log.includes('2.0.0'));
			t.ok(!log.includes('v2.0.0'));
		},
	});
});

test('run: command line options override options from package.json', async (t) => {
	await run(['', '', '--output', 'should-be-this.md'], {
		...deps,
		fileExists: (path) => path === '.auto-changelog',
		readJson: () => ({
			'auto-changelog': {
				output: 'should-not-be-this.md',
			},
		}),
		writeFile(output, log) {
			t.equal(output, 'should-be-this.md');
		},
	});
});

test('run: uses options from .auto-changelog', async (t) => {
	const expected = await readFile(join(__dirname, 'data', 'template-keepachangelog.md'));

	await run(['', ''], {
		...deps,
		fileExists: (path) => path === '.auto-changelog',
		readJson(path) {
			return path === '.auto-changelog' ? { template: 'keepachangelog' } : null;
		},
		writeFile(output, log) {
			t.equal(log, expected);
		},
	});
});

test('run: command line options override options from .auto-changelog', async (t) => {
	await run(['', '', '--output', 'should-be-this.md'], {
		...deps,
		fileExists: (path) => path === '.auto-changelog',
		readJson(path) {
			return path === '.auto-changelog' ? { output: 'should-not-be-this.md' } : null;
		},
		writeFile(output, log) {
			t.equal(output, 'should-be-this.md');
		},
	});
});

function rejectsConfig(label, config, fromPackage = false) {
	test(`getOptions: refuses to run when in-repo config ${label}`, (t) => {
		const value = fromPackage ? { 'auto-changelog': config } : config;
		function readJson(file) {
			return (fromPackage ? file === 'package.json' : file === '.auto-changelog')
				? value
				: null;
		}
		return getOptions(['', ''], { readJson })
			.then(() => t.fail('should refuse to run'))
			.catch(() => t.pass('refused'));
	});
}

rejectsConfig('sets handlebarsSetup', { handlebarsSetup: 'evil.js' }, true);
rejectsConfig('sets plugins', { plugins: ['evil'] });
rejectsConfig('sets a URL template', { template: 'http://attacker.example/evil.hbs' });
rejectsConfig('sets an argument-injecting remote', { remote: 'origin --output=/tmp/pwned' });
rejectsConfig('sets a traversing output path', { output: '../../.git/hooks/pre-commit' });
rejectsConfig('sets an absolute output path', { output: '/tmp/pwned.md' });
rejectsConfig('sets an appendGitLog with --output', { appendGitLog: '--output=../pwned' });
rejectsConfig('sets an appendGitTag with --output', { appendGitTag: '--first-parent --output ../pwned' });

test('getOptions: keeps a non-URL template from in-repo config', async (t) => {
	function readJson(file) {
		return file === '.auto-changelog'
			? { template: 'keepachangelog' }
			: null;
	}
	const options = await getOptions(['', ''], { readJson });
	t.equal(options.template, 'keepachangelog');
});

test('getOptions: keeps a normal remote from in-repo config', async (t) => {
	function readJson(file) {
		return file === '.auto-changelog'
			? { remote: 'upstream' }
			: null;
	}
	const options = await getOptions(['', ''], { readJson });
	t.equal(options.remote, 'upstream');
});

test('getOptions: keeps an in-repo output path from in-repo config', async (t) => {
	function readJson(file) {
		return file === '.auto-changelog'
			? { output: 'docs/HISTORY.md' }
			: null;
	}
	const options = await getOptions(['', ''], { readJson });
	t.equal(options.output, 'docs/HISTORY.md');
});

test('getOptions: honors a safe appendGitLog and appendGitTag from in-repo config', async (t) => {
	function readJson(file) {
		return file === '.auto-changelog'
			? { appendGitLog: '--first-parent', appendGitTag: '--sort=-creatordate' }
			: null;
	}
	const options = await getOptions(['', ''], { readJson });
	t.equal(options.appendGitLog, '--first-parent');
	t.equal(options.appendGitTag, '--sort=-creatordate');
});

test('getOptions: honors handlebarsSetup from the command line', async (t) => {
	const options = await getOptions(['', '', '--handlebars-setup', 'setup.js']);
	t.equal(options.handlebarsSetup, 'setup.js');
});

test('getOptions: honors a URL template from the command line', async (t) => {
	const options = await getOptions(['', '', '--template', 'http://example.local/template.hbs']);
	t.equal(options.template, 'http://example.local/template.hbs');
});

test('getOptions: --unsafe-config honors unsafe options from in-repo config', async (t) => {
	function readJson(file) {
		return file === 'package.json'
			? { 'auto-changelog': { handlebarsSetup: 'setup.js', appendGitLog: '--output=anywhere' } }
			: null;
	}
	const options = await getOptions(['', '', '--unsafe-config'], { readJson });
	t.equal(options.handlebarsSetup, 'setup.js');
	t.equal(options.appendGitLog, '--output=anywhere');
});

test('getOptions: honors plugins from the command line', async (t) => {
	const options = await getOptions(['', '', '--plugins', 'foo'], { importCwd: (name) => name });
	t.deepEqual(options.plugins, ['auto-changelog-foo']);
});

test('getOptions: throws a useful error for --plugins with no names', async (t) => {
	try {
		await getOptions(['', '', '--plugins'], { importCwd: (name) => name });
		t.fail('should throw');
	} catch (error) {
		t.match(error.message, /--plugins requires at least one plugin name/);
	}
});

test.skip('run: supports unreleased option', async (t) => {
	await run(['', '', '--unreleased'], {
		...deps,
		writeFile(output, log) {
			t.ok(log.includes('Unreleased'));
			t.ok(log.includes('https://github.com/user/repo/compare/v1.0.0...HEAD'));
		},
	});
});

const { commitsMap } = require('./data/commits-map');

test.skip('run: supports breakingPattern option', async (t) => {
	function addBreakingFlag(commit) {
		if ((/Some breaking change/).test(commit.message)) {
			return { ...commit, breaking: true };
		}
		return commit;
	}
	// No need to actually pass in the option here as we amend the commits
	await run(['', '', '--commit-limit', '0'], {
		...deps,
		fetchCommits: (diff) => Promise.resolve(commitsMap[diff].map(addBreakingFlag)),
		writeFile(output, log) {
			t.ok(log.includes('**Breaking change:** Some breaking change'));
		},
	});
});

test.skip('run: supports releaseSummary option', async (t) => {
	await run(['', '', '--release-summary'], {
		...deps,
		writeFile(output, log) {
			t.ok(log.includes('This is my major release description.\n\n- And a bullet point'));
		},
	});
});

test('run: does not error when using latest version option', async (t) => {
	await run(['', '', '--latest-version', 'v3.0.0'], deps);
	t.pass('did not error');
});

// For some reason is preventing the fetchTags test from running…?`
test.skip('run: does not error when using stdout option', async (t) => {
	await run(['', '', '--stdout'], deps);
	t.pass('did not error');
});

test('run: throws an error when no package found', (t) => run(['', '', '--package'], deps)
	.then(() => t.fail('Should throw an error'))
	.catch(() => t.pass('threw')));

test('run: throws an error when no custom package found', (t) => run(['', '', '--package-file', 'does-not-exist.json'], deps)
	.then(() => t.fail('Should throw an error'))
	.catch(() => t.pass('threw')));

test('run: throws an error when no template found', (t) => run(['', '', '--template', 'not-found'], deps)
	.then(() => t.fail('Should throw an error'))
	.catch(() => t.pass('threw')));

test('getOptions: --help prints usage and parses no options', async (t) => {
	const { exitCode } = process;
	const logs = captureLog(t);
	const options = await getOptions(['', '', '--help'], deps);
	const printed = logs();
	process.exitCode = exitCode;
	t.equal(options, null, 'returns null so the caller stops');
	t.ok(printed.join('\n').includes('Usage: auto-changelog'), 'prints the usage text');
});

test('getOptions: --version prints the v-prefixed version', async (t) => {
	const { exitCode } = process;
	const logs = captureLog(t);
	const options = await getOptions(['', '', '--version'], deps);
	const printed = logs();
	process.exitCode = exitCode;
	t.equal(options, null, 'returns null so the caller stops');
	t.deepEqual(printed, [`v${version}`], 'prints the version with a `v` prefix');
});

test('getOptions: rejects an unsupported --sort-commits', async (t) => {
	const { exitCode } = process;
	const errors = t.capture(console, 'error');
	const logs = captureLog(t);
	const options = await getOptions(['', '', '--sort-commits', 'nope'], deps);
	logs();
	errors.restore?.();
	const failedWith = process.exitCode;
	process.exitCode = exitCode;
	t.equal(options, null, 'returns null so the caller stops');
	t.equal(failedWith, 1, 'sets a failing exit code');
	t.deepEqual(errors().map((call) => call.args.join(' ')), ['Error: Invalid value for option "sort-commits"'], 'reports the invalid value');
});

test('getOptions: accepts every supported --sort-commits', async (t) => {
	const choices = ['relevance', 'date', 'date-desc', 'subject', 'subject-desc'];
	const options = await Promise.all(choices.map((sortCommits) => getOptions(['', '', '--sort-commits', sortCommits], deps)));
	t.deepEqual(options.map((o) => o.sortCommits), choices);
});

test('getOptions: --append-git-log and --append-git-tag take a dash-leading value attached with =', async (t) => {
	const options = await getOptions(['', '', '--append-git-log=--first-parent --no-merges', '--append-git-tag=--merged'], deps);
	t.equal(options.appendGitLog, '--first-parent --no-merges');
	t.equal(options.appendGitTag, '--merged');
});

test('getOptions: --append-git-log rejects a dash-leading value given separately', async (t) => {
	t.match(await rejectedWith(t, ['--append-git-log', '--first-parent']), /Option '--append-git-log' argument is ambiguous/);
});

test('getOptions: --append-git-tag rejects a dash-leading value given separately', async (t) => {
	t.match(await rejectedWith(t, ['--append-git-tag', '--merged']), /Option '--append-git-tag' argument is ambiguous/);
});

test('getOptions: honors repeated --plugins', async (t) => {
	const options = await getOptions(['', '', '--plugins', 'foo', '--plugins=bar'], { importCwd: (name) => name });
	t.deepEqual(options.plugins, ['auto-changelog-foo', 'auto-changelog-bar']);
});

test('getOptions: --plugins takes one name per flag', async (t) => {
	t.match(await rejectedWith(t, ['--plugins', 'foo', 'bar']), /Unexpected argument 'bar'/);
});

test('getOptions: --no-commit-limit disables the commit limit', async (t) => {
	const options = await getOptions(['', '', '--no-commit-limit'], deps);
	t.equal(options.commitLimit, false);
	t.equal(options.backfillLimit, 3, 'leaves the backfill limit alone');
});

test('getOptions: --no-backfill-limit disables the backfill limit', async (t) => {
	const options = await getOptions(['', '', '--no-backfill-limit'], deps);
	t.equal(options.backfillLimit, false);
	t.equal(options.commitLimit, 3, 'leaves the commit limit alone');
});

test('getOptions: --commit-limit and --no-commit-limit are mutually exclusive', async (t) => {
	t.match(await rejectedWith(t, ['--commit-limit', '10', '--no-commit-limit']), /`--commit-limit` and `--no-commit-limit` are mutually exclusive/);
	t.match(await rejectedWith(t, ['--no-commit-limit', '-l', '10']), /`--commit-limit` and `--no-commit-limit` are mutually exclusive/);
});

test('getOptions: --backfill-limit and --no-backfill-limit are mutually exclusive', async (t) => {
	t.match(await rejectedWith(t, ['--no-backfill-limit', '--backfill-limit=1']), /`--backfill-limit` and `--no-backfill-limit` are mutually exclusive/);
});

test('getOptions: -h is not a short flag for --help', async (t) => {
	t.match(await rejectedWith(t, ['-h']), /Unknown option '-h'/);
});

test('getOptions: -V is not a short flag for --version', async (t) => {
	t.match(await rejectedWith(t, ['-V']), /Unknown option '-V'/);
});

test('run: does nothing when --help was handled', async (t) => {
	const { exitCode } = process;
	const logs = captureLog(t);
	function explode(name) {
		return () => t.fail(`${name} should not run`);
	}
	await run(['', '', '--help'], {
		...deps,
		fetchTags: explode('fetchTags'),
		parseReleases: explode('parseReleases'),
		writeFile: explode('writeFile'),
	});
	logs();
	process.exitCode = exitCode;
	t.pass('returned without fetching or writing anything');
});
