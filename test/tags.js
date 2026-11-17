'use strict';

const test = require('tape');
const remotes = require('./data/remotes');
const { fetchTags } = require('../src/tags');
const { captureStderr } = require('./utils/stderr');

const options = {
	tagPrefix: '',
	...remotes.github,
};

const DEFAULT_TAGS = [
	'v0.1.0---2000-02-01',
	'v0.2.0---2000-03-01',
	'v0.2.1---2000-03-02',
	'v0.2.2---2000-03-03',
	'v0.3.0---2000-04-01',
	'v1.0.0---2001-01-01',
].join('\n');

function gitTags(tags) {
	return { cmd: () => Promise.resolve(tags) };
}

const defaultTags = gitTags(DEFAULT_TAGS);

test('fetchTags: fetches tags', async (t) => {
	t.deepEqual(await fetchTags(options, defaultTags), [
		{
			tag: 'v1.0.0',
			version: 'v1.0.0',
			title: 'v1.0.0',
			date: '2001-01-01',
			isoDate: '2001-01-01',
			niceDate: '1 January 2001',
			diff: 'v0.3.0..v1.0.0',
			href: 'https://github.com/user/repo/compare/v0.3.0...v1.0.0',
			major: true,
			minor: false,
		},
		{
			tag: 'v0.3.0',
			version: 'v0.3.0',
			title: 'v0.3.0',
			date: '2000-04-01',
			isoDate: '2000-04-01',
			niceDate: '1 April 2000',
			diff: 'v0.2.2..v0.3.0',
			href: 'https://github.com/user/repo/compare/v0.2.2...v0.3.0',
			major: false,
			minor: true,
		},
		{
			tag: 'v0.2.2',
			version: 'v0.2.2',
			title: 'v0.2.2',
			date: '2000-03-03',
			isoDate: '2000-03-03',
			niceDate: '3 March 2000',
			diff: 'v0.2.1..v0.2.2',
			href: 'https://github.com/user/repo/compare/v0.2.1...v0.2.2',
			major: false,
			minor: false,
		},
		{
			tag: 'v0.2.1',
			version: 'v0.2.1',
			title: 'v0.2.1',
			date: '2000-03-02',
			isoDate: '2000-03-02',
			niceDate: '2 March 2000',
			diff: 'v0.2.0..v0.2.1',
			href: 'https://github.com/user/repo/compare/v0.2.0...v0.2.1',
			major: false,
			minor: false,
		},
		{
			tag: 'v0.2.0',
			version: 'v0.2.0',
			title: 'v0.2.0',
			date: '2000-03-01',
			isoDate: '2000-03-01',
			niceDate: '1 March 2000',
			diff: 'v0.1.0..v0.2.0',
			href: 'https://github.com/user/repo/compare/v0.1.0...v0.2.0',
			major: false,
			minor: true,
		},
		{
			tag: 'v0.1.0',
			version: 'v0.1.0',
			title: 'v0.1.0',
			date: '2000-02-01',
			isoDate: '2000-02-01',
			niceDate: '1 February 2000',
			diff: 'v0.1.0',
			href: null,
			major: false,
			minor: false,
		},
	]);
});

test('fetchTags: supports --starting-version', async (t) => {
	t.equal((await fetchTags({ ...options, startingVersion: 'v0.3' }, defaultTags)).length, 2);
	t.equal((await fetchTags({ ...options, startingVersion: 'v1' }, defaultTags)).length, 1); // Inferred semver
	t.equal((await fetchTags({ ...options, startingVersion: 'v0.2.8' }, defaultTags)).length, 2); // Non-existent tag from the past
	t.equal((await fetchTags({ ...options, startingVersion: 'v2.0.0' }, defaultTags)).length, 0); // Non-existent tag from the future
});

test('fetchTags: supports --starting-version older than every tag', async (t) => {
	t.equal((await fetchTags({ ...options, startingVersion: 'v0.0.1' }, defaultTags)).length, 6);
});

test('fetchTags: throws a useful error for an invalid --starting-version', async (t) => {
	try {
		await fetchTags({ ...options, startingVersion: 'not-a-version' }, defaultTags);
		t.fail('should throw');
	} catch (error) {
		t.match(error.message, /not a valid version/);
	}
});

test('fetchTags: supports --starting-version with non-semver tags', async (t) => {
	const tags = await fetchTags(
		{ ...options, tagPattern: '^build-', startingVersion: 'v0.0.1' },
		gitTags(['build-9---2001-01-01', 'build-10---2002-01-01'].join('\n')),
	);
	t.equal(tags.length, 2);
});

test('fetchTags: supports --ending-version', async (t) => {
	t.equal((await fetchTags({ ...options, endingVersion: 'v0.2.2' }, defaultTags)).length, 4);
});

test('fetchTags: supports --ending-version that is not an exact tag', async (t) => {
	t.equal((await fetchTags({ ...options, endingVersion: 'v0.3' }, defaultTags)).length, 5, 'inferred semver');
	t.equal((await fetchTags({ ...options, endingVersion: '0.2.2' }, defaultTags)).length, 4, 'without the `v`');
	t.equal((await fetchTags({ ...options, endingVersion: 'v0.2.8' }, defaultTags)).length, 4, 'non-existent version between tags');
	t.equal((await fetchTags({ ...options, endingVersion: 'v2.0.0' }, defaultTags)).length, 6, 'non-existent version newer than every tag');
	t.equal((await fetchTags({ ...options, endingVersion: 'v0.0.1' }, defaultTags)).length, 0, 'non-existent version older than every tag');
});

test('fetchTags: supports --ending-version without the tag prefix', async (t) => {
	const tags = await fetchTags(
		{ ...options, tagPrefix: 'my-package@', endingVersion: '1.1.0' },
		gitTags([
			'my-package@1.0.0---2001-01-01',
			'my-package@1.1.0---2001-02-01',
			'my-package@1.2.0---2001-03-01',
		].join('\n')),
	);
	t.deepEqual(tags.map(({ tag }) => tag), ['my-package@1.1.0', 'my-package@1.0.0']);
});

test('fetchTags: throws a useful error for an invalid --ending-version', async (t) => {
	try {
		await fetchTags({ ...options, endingVersion: 'not-a-version' }, defaultTags);
		t.fail('should throw');
	} catch (error) {
		t.match(error.message, /Ending version 'not-a-version' is not a valid version/);
	}
});

test('fetchTags: supports --ending-version with non-semver tags', async (t) => {
	const tags = await fetchTags(
		{ ...options, tagPattern: '^build-', endingVersion: 'v9.0.0' },
		gitTags(['build-9---2001-01-01', 'build-10---2002-01-01'].join('\n')),
	);
	t.equal(tags.length, 0);
});

test('fetchTags: supports --starting-version and --ending-version', async (t) => {
	t.equal((await fetchTags({ ...options, startingVersion: 'v0.2.1', endingVersion: 'v0.2.2' }, defaultTags)).length, 2);
});

test('fetchTags: supports --starting-date', async (t) => {
	t.equal((await fetchTags({ ...options, startingDate: '2000-03-01' }, defaultTags)).length, 5);
	t.equal((await fetchTags({ ...options, startingDate: '2000-03-02' }, defaultTags)).length, 4);
	t.equal((await fetchTags({ ...options, startingDate: '2000-05-01' }, defaultTags)).length, 1);
});

test('fetchTags: sorts tags using semver', async (t) => {
	const tags = await fetchTags(options, gitTags([
		'0.1.0---2000-02-01',
		'0.2.0---2000-03-01',
		'0.3.0---2000-04-01',
		'0.2.1---2000-03-02',
		'0.2.2---2000-03-03',
		'1.0.0---2001-01-01',
	].join('\n')));
	t.deepEqual(tags.map((tag) => tag.title), [
		'1.0.0',
		'0.3.0',
		'0.2.2',
		'0.2.1',
		'0.2.0',
		'0.1.0',
	]);
});

test('fetchTags: does not sort when sorting via --append-git-tag', async (t) => {
	const tags = await fetchTags({ ...options, appendGitTag: '--sort=v:refname' }, gitTags([
		'0.1.0---2000-02-01',
		'0.2.0---2000-03-01',
		'0.3.0---2000-04-01',
		'0.2.1---2000-03-02',
		'0.2.2---2000-03-03',
		'1.0.0---2001-01-01',
	].join('\n')));
	t.deepEqual(tags.map((tag) => tag.title), [
		'0.1.0',
		'0.2.0',
		'0.3.0',
		'0.2.1',
		'0.2.2',
		'1.0.0',
	]);
});

test('fetchTags: supports partial semver tags', async (t) => {
	const tags = await fetchTags(options, gitTags([
		'v0.1---2000-02-01',
		'v0.2---2000-03-01',
		'v0.2.1---2000-03-02',
		'v0.2.2---2000-03-03',
		'v0.3---2000-04-01',
		'v1---2001-01-01',
	].join('\n')));
	t.deepEqual(tags.map((tag) => tag.version), [
		'v1.0.0',
		'v0.3.0',
		'v0.2.2',
		'v0.2.1',
		'v0.2.0',
		'v0.1.0',
	]);
});

test('fetchTags: supports --latest-version without v prefix', async (t) => {
	const tags = await fetchTags({ ...options, latestVersion: '2.0.0' }, gitTags([
		'0.1.0---2000-02-01',
		'0.2.0---2000-03-01',
		'0.2.1---2000-03-02',
		'0.2.2---2000-03-03',
		'0.3.0---2000-04-01',
		'1.0.0---2001-01-01',
	].join('\n')));
	t.deepEqual(tags.map((tag) => tag.title), [
		'2.0.0',
		'1.0.0',
		'0.3.0',
		'0.2.2',
		'0.2.1',
		'0.2.0',
		'0.1.0',
	]);
});

test('fetchTags: ignores invalid semver tags', async (t) => {
	const tags = await fetchTags(options, gitTags([
		'v0.1.0---2000-02-01',
		'invalid-semver-tag---2000-03-01',
		'v0.2.0---2000-03-02',
	].join('\n')));
	t.deepEqual(tags.map((tag) => tag.version), [
		'v0.2.0',
		'v0.1.0',
	]);
});

test('fetchTags: strips the tag prefix from titles when stripTagPrefix is set', async (t) => {
	const tags = await fetchTags({ ...options, tagPrefix: 'my-package@', stripTagPrefix: true }, gitTags([
		'my-package@0.1.0---2000-02-01',
		'my-package@1.0.0---2001-01-01',
	].join('\n')));
	t.deepEqual(tags.map((tag) => tag.title), ['1.0.0', '0.1.0'], 'titles drop the prefix');
	t.deepEqual(tags.map((tag) => tag.version), ['1.0.0', '0.1.0']);
	t.deepEqual(tags.map((tag) => tag.tag), ['my-package@1.0.0', 'my-package@0.1.0'], 'tags keep the prefix');
	t.equal(tags[0].href, 'https://github.com/user/repo/compare/my-package@0.1.0...my-package@1.0.0', 'compare link uses full tags');
});

test('fetchTags: keeps the tag prefix in titles by default', async (t) => {
	const tags = await fetchTags({ ...options, tagPrefix: 'my-package@' }, gitTags('my-package@1.0.0---2001-01-01'));
	t.equal(tags[0].title, 'my-package@1.0.0');
	t.equal(tags[0].version, '1.0.0');
});

test('fetchTags: targets the prefixed tag in the latest-version compare link when stripping', async (t) => {
	const tags = await fetchTags(
		{ ...options, tagPrefix: 'my-package@', stripTagPrefix: true, latestVersion: '2.0.0' },
		gitTags('my-package@1.0.0---2001-01-01'),
	);
	t.equal(tags[0].title, '2.0.0', 'latest title is the bare version');
	t.equal(tags[0].href, 'https://github.com/user/repo/compare/my-package@1.0.0...my-package@2.0.0', 'links to the prefixed tag');
});

test('fetchTags: keeps the v convention after the package prefix in the latest-version compare link', async (t) => {
	const tags = await fetchTags(
		{ ...options, tagPrefix: 'my-package@', stripTagPrefix: true, latestVersion: '2.0.0' },
		gitTags('my-package@v1.0.0---2001-01-01'),
	);
	t.equal(tags[0].title, 'v2.0.0', 'latest title keeps the v convention');
	t.equal(tags[0].href, 'https://github.com/user/repo/compare/my-package@v1.0.0...my-package@v2.0.0', 'links to the real prefixed v-tag');
});

test('fetchTags: uses the tag prefix for the latest version when not stripping it', async (t) => {
	const tags = await fetchTags(
		{ ...options, tagPrefix: 'my-package@', latestVersion: '0.0.2' },
		gitTags('my-package@v0.0.1---2001-01-01'),
	);
	t.deepEqual(tags.map(({ title }) => title), ['my-package@v0.0.2', 'my-package@v0.0.1'], 'latest title matches the other titles');
	t.equal(tags[0].href, 'https://github.com/user/repo/compare/my-package@v0.0.1...my-package@v0.0.2', 'links to the prefixed tag');
});

test('fetchTags: does not duplicate the latest version when its prefixed tag exists', async (t) => {
	const tags = await fetchTags(
		{ ...options, tagPrefix: 'my-package@', latestVersion: '0.0.2' },
		gitTags([
			'my-package@v0.0.1---2001-01-01',
			'my-package@v0.0.2---2001-02-01',
		].join('\n')),
	);
	t.deepEqual(tags.map(({ tag }) => tag), ['my-package@v0.0.2', 'my-package@v0.0.1']);
});

test('fetchTags: does not add a latest-version entry when that version is already tagged', async (t) => {
	const tags = await fetchTags({ ...options, latestVersion: '1.0.0' }, defaultTags);
	t.deepEqual(tags, await fetchTags(options, defaultTags), 'same as without a latest version');

	const prefixed = await fetchTags(
		{ ...options, tagPrefix: 'my-package@', stripTagPrefix: true, latestVersion: '1.0.0' },
		gitTags('my-package@1.0.0---2001-01-01'),
	);
	t.deepEqual(prefixed.map(({ tag }) => tag), ['my-package@1.0.0'], 'matches the prefixed tag');
});

test('fetchTags: adds an unreleased entry when the latest version is already tagged', async (t) => {
	const tags = await fetchTags({ ...options, latestVersion: '1.0.0', unreleased: true }, defaultTags);
	t.equal(tags.length, 7);
	t.equal(tags[0].title, 'Unreleased');
	t.equal(tags[0].href, 'https://github.com/user/repo/compare/v1.0.0...HEAD');
});

const BUILD_TAGS = gitTags([
	'5.0.0+2---2000-03-01',
	'4.9.0---2000-01-01',
	'5.0.0+10---2000-04-01',
	'5.0.0---2000-02-01',
	'5.0.0+1---2000-02-15',
].join('\n'));

test('fetchTags: sorts by build metadata', async (t) => {
	const tags = await fetchTags(options, BUILD_TAGS);
	t.deepEqual(tags.map((tag) => tag.title), [
		'5.0.0+10',
		'5.0.0+2',
		'5.0.0+1',
		'5.0.0',
		'4.9.0',
	]);
});

test('fetchTags: --starting-version respects build metadata', async (t) => {
	const exact = await fetchTags({ ...options, startingVersion: '5.0.0+2' }, BUILD_TAGS);
	t.deepEqual(exact.map((tag) => tag.title), ['5.0.0+10', '5.0.0+2'], 'exact tag');

	const between = await fetchTags({ ...options, startingVersion: '5.0.0+3' }, BUILD_TAGS);
	t.deepEqual(between.map((tag) => tag.title), ['5.0.0+10'], 'not a tag');
});

test('fetchTags: --ending-version respects build metadata', async (t) => {
	const tags = await fetchTags({ ...options, endingVersion: '5.0.0+3' }, BUILD_TAGS);
	t.deepEqual(tags.map((tag) => tag.title), [
		'5.0.0+2',
		'5.0.0+1',
		'5.0.0',
		'4.9.0',
	]);
});

test('fetchTags: supports tag parsing through --tag-parser-pattern and --tag-parser-replacement', async (t) => {
	const tags = await fetchTags({
		...options,
		tagParserPattern: '^version (\\d+)\\.(\\d+)\\.(\\d+) \\|\\| build (\\d+)$',
		tagParserReplacement: '$1.$2.$3-build.$4',
	}, gitTags([
		'version 0.1.0 || build 2345---2000-02-01',
		'version 2.1.0 || build 2355---2000-02-01',
		'version 3.2.1 || build 2367---2000-02-01',
	].join('\n')));
	t.deepEqual(tags.map((tag) => tag.version), [
		'3.2.1-build.2367',
		'2.1.0-build.2355',
		'0.1.0-build.2345',
	]);
});

test('fetchTags: a tag prefix is matched literally', async (t) => {
	const plus = await fetchTags({ ...options, tagPrefix: 'a+' }, gitTags('a+1.0.0---2000-01-01\na+2.0.0---2000-02-01'));
	t.deepEqual(plus.map((tag) => tag.version), ['2.0.0', '1.0.0'], 'regex quantifier');

	const paren = await fetchTags({ ...options, tagPrefix: 'pkg(' }, gitTags('pkg(1.0.0---2000-01-01'));
	t.deepEqual(paren.map((tag) => tag.version), ['1.0.0'], 'regex group');
});

test('fetchTags: a tag prefix is only removed from the start of a version option', async (t) => {
	const RC_TAGS = gitTags([
		'v1.0.0-rc.1---2000-01-01',
		'v1.0.0-rc.2---2000-01-02',
		'v1.0.0-rc.3---2000-01-03',
		'v1.0.0---2000-01-04',
	].join('\n'));
	const starting = await fetchTags({ ...options, tagPrefix: 'v', startingVersion: '1.0.0-rc.v2' }, RC_TAGS);
	t.deepEqual(starting.map(({ tag }) => tag), ['v1.0.0'], '--starting-version');
	const ending = await fetchTags({ ...options, tagPrefix: 'v', endingVersion: '1.0.0-rc.v2' }, RC_TAGS);
	t.deepEqual(ending.map(({ tag }) => tag), ['v1.0.0-rc.3', 'v1.0.0-rc.2', 'v1.0.0-rc.1'], '--ending-version');
});

async function fetchTagsWithStderr(t, tagOptions, tags) {
	const stderr = t.capture(process.stderr, 'write');
	try {
		return {
			tags: await fetchTags({ ...options, ...tagOptions }, gitTags(tags.map((tag) => `${tag}---2000-01-01`).join('\n'))),
			stderr: stderr().map((call) => call.args[0]).join(''),
		};
	} finally {
		stderr.restore?.();
	}
}

test('fetchTags: only tags starting with the tag prefix are releases', async (t) => {
	const { tags, stderr } = await fetchTagsWithStderr(t, { tagPrefix: 'v' }, [
		'3.8.0-3316',
		'3.8.0-3318',
		'3.8.0-3319',
		'3.8.0-3320',
		'v3.6.0',
		'v3.7.0',
		'v3.8.0',
	]);
	t.deepEqual(tags.map(({ tag, diff }) => ({ tag, diff })), [
		{ tag: 'v3.8.0', diff: 'v3.7.0..v3.8.0' },
		{ tag: 'v3.7.0', diff: 'v3.6.0..v3.7.0' },
		{ tag: 'v3.6.0', diff: 'v3.6.0' },
	]);
	t.match(stderr, /auto-changelog: skipped 4 version tags without the tag prefix "v" \(3\.8\.0-3320, 3\.8\.0-3319, 3\.8\.0-3318, …\)\n/, 'says which tags were skipped');
});

test('fetchTags: the tag prefix applies before --tag-pattern', async (t) => {
	const { tags, stderr } = await fetchTagsWithStderr(t, { tagPrefix: 'ui-kit_', tagPattern: '_\\d+$' }, [
		'ui-kit_1',
		'ui-kit_2',
		'other_3',
	]);
	t.deepEqual(tags.map(({ tag }) => tag), ['ui-kit_2', 'ui-kit_1']);
	t.match(stderr, /skipped 1 version tag without the tag prefix "ui-kit_" \(other_3\)\n/, 'one skipped tag');
});

test('fetchTags: says nothing about tags without the prefix that are not versions', async (t) => {
	const { tags, stderr } = await fetchTagsWithStderr(t, { tagPrefix: 'core@' }, [
		'core@1.0.0',
		'ui@1.0.0',
		'not-a-version',
	]);
	t.deepEqual(tags.map(({ tag }) => tag), ['core@1.0.0']);
	t.equal(stderr, '', 'no notice');
});

test('fetchTags: fails when only version tags without the tag prefix exist', async (t) => {
	await fetchTagsWithStderr(t, { tagPrefix: 'pkg@' }, ['v1.0.0', 'v1.1.0', 'pkg@next']).then(
		() => t.fail('should throw'),
		(error) => t.match(error.message, /^No version tags start with the tag prefix "pkg@", but 2 version tags without it do \(v1\.1\.0, v1\.0\.0\); check `--tag-prefix`/, 'several tags'),
	);
	await fetchTagsWithStderr(t, { tagPrefix: 'pkg@' }, ['v1.0.0']).then(
		() => t.fail('should throw'),
		(error) => t.match(error.message, /but 1 version tag without it does \(v1\.0\.0\)/, 'one tag'),
	);
	const { tags } = await fetchTagsWithStderr(t, { tagPrefix: 'pkg@', unreleased: true }, ['other']);
	t.deepEqual(tags.map(({ title }) => title), ['Unreleased'], 'no error without other version tags');
});

function gitRepo({
	branch = 'refs/heads/feature/x',
	upstream = 'origin---refs/heads/feature/x',
	remoteHead = 'refs/remotes/origin/main',
} = {}) {
	return {
		cmd(command) {
			if (command.startsWith('git tag')) {
				return Promise.resolve(DEFAULT_TAGS);
			}
			if (command === 'git symbolic-ref -q HEAD') {
				return Promise.resolve(`${branch}\n`);
			}
			if (command.startsWith('git for-each-ref') && command.endsWith(` ${branch}`)) {
				return Promise.resolve(`${upstream}\n`);
			}
			if (command === 'git symbolic-ref -q refs/remotes/origin/HEAD') {
				return Promise.resolve(`${remoteHead}\n`);
			}
			return Promise.reject(new Error(`unexpected command: ${command}`));
		},
	};
}

async function getUnreleasedHref(repo, extra) {
	const [unreleased] = await fetchTags({
		...options,
		remote: 'origin',
		unreleased: true,
		...extra,
	}, gitRepo(repo));
	return unreleased.href;
}

test('fetchTags: the unreleased compare link targets the remote branch being tracked', async (t) => {
	t.equal(await getUnreleasedHref(), 'https://github.com/user/repo/compare/v1.0.0...feature/x', 'a branch that is not the default');
	t.equal(
		await getUnreleasedHref({ branch: 'refs/heads/local', upstream: 'origin---refs/heads/remote-name' }),
		'https://github.com/user/repo/compare/v1.0.0...remote-name',
		'the remote branch name, not the local one',
	);
	t.equal(
		await getUnreleasedHref({}, { latestVersion: '1.1.0' }),
		'https://github.com/user/repo/compare/v1.0.0...v1.1.0',
		'a latest version still targets its tag',
	);
});

test('fetchTags: the unreleased compare link targets HEAD when no other branch is known', async (t) => {
	const head = 'https://github.com/user/repo/compare/v1.0.0...HEAD';
	t.equal(await getUnreleasedHref({ upstream: 'origin---refs/heads/main', branch: 'refs/heads/main' }), head, 'the default branch');
	t.equal(await getUnreleasedHref({ branch: '' }), head, 'a detached HEAD');
	t.equal(await getUnreleasedHref({ upstream: '---' }), head, 'a branch with no upstream');
	t.equal(await getUnreleasedHref({ upstream: 'fork---refs/heads/feature/x' }), head, 'an upstream on another remote');
	t.equal(await getUnreleasedHref({ remoteHead: '' }), head, 'an unknown default branch');
});

const PRERELEASE_TAGS = gitTags([
	'v1.0.0---2000-01-01',
	'v2.0.0-beta.1---2000-02-01',
	'v2.0.0-rc.1---2000-03-01',
	'v2.0.0---2000-04-01',
	'v2.1.0---2000-05-01',
	'v3.0.0-rc.1---2000-06-01',
	'v3.0.0---2000-07-01',
].join('\n'));

async function getDiffs(extra, tags = PRERELEASE_TAGS) {
	const fetched = await fetchTags({ ...options, ...extra }, tags);
	return Object.fromEntries(fetched.map(({ title, diff }) => [title, diff]));
}

test('fetchTags: a release after prereleases also covers their changes', async (t) => {
	t.deepEqual(await getDiffs({}), {
		'v3.0.0': 'v2.1.0..v3.0.0',
		'v3.0.0-rc.1': 'v2.1.0..v3.0.0-rc.1',
		'v2.1.0': 'v2.0.0..v2.1.0',
		'v2.0.0': 'v1.0.0..v2.0.0',
		'v2.0.0-rc.1': 'v2.0.0-beta.1..v2.0.0-rc.1',
		'v2.0.0-beta.1': 'v1.0.0..v2.0.0-beta.1',
		'v1.0.0': 'v1.0.0',
	});

	const [v3] = await fetchTags(options, PRERELEASE_TAGS);
	t.equal(v3.href, 'https://github.com/user/repo/compare/v2.1.0...v3.0.0', 'the compare link matches');
	t.equal(v3.major, true, 'major relative to the previous release');

	const onlyPrereleases = gitTags('v1.0.0-beta.1---2000-01-01\nv1.0.0---2000-02-01');
	t.deepEqual(await getDiffs({}, onlyPrereleases), {
		'v1.0.0': 'v1.0.0',
		'v1.0.0-beta.1': 'v1.0.0-beta.1',
	}, 'the first release covers everything');
});

test('fetchTags: --rollup-prereleases-disabled', async (t) => {
	const never = await getDiffs({ rollupPrereleasesDisabled: true });
	t.equal(never['v3.0.0'], 'v3.0.0-rc.1..v3.0.0', 'with no value, never');
	t.equal(never['v2.0.0'], 'v2.0.0-rc.1..v2.0.0', 'with no value, never');

	const untils = ['2.0.0', 'v2.0.0', '2.1'];
	const results = await Promise.all(untils.map((until) => getDiffs({ rollupPrereleasesDisabled: until })));
	results.forEach((diffs, i) => {
		t.equal(diffs['v2.0.0'], 'v2.0.0-rc.1..v2.0.0', `not for releases up to ${untils[i]}`);
		t.equal(diffs['v3.0.0'], 'v2.1.0..v3.0.0', `for releases after ${untils[i]}`);
	});

	const prefixed = await getDiffs({ tagPrefix: 'v', rollupPrereleasesDisabled: 'v2.0.0' });
	t.equal(prefixed['v2.0.0'], 'v2.0.0-rc.1..v2.0.0', 'a version with the tag prefix');

	t.equal((await getDiffs({ rollupPrereleasesDisabled: false }))['v2.0.0'], 'v1.0.0..v2.0.0', '`false` from config leaves it on');

	await fetchTags({ ...options, rollupPrereleasesDisabled: 'soon' }, PRERELEASE_TAGS).then(
		() => t.fail('should throw'),
		(error) => t.match(error.message, /`--rollup-prereleases-disabled` takes a version, or no value; got `soon`/, 'not a version'),
	);
});

test('fetchTags: a latest version after prereleases also covers their changes', async (t) => {
	const tags = gitTags('v1.0.0---2000-01-01\nv2.0.0-rc.1---2000-02-01');
	const [rolled] = await fetchTags({ ...options, latestVersion: '2.0.0' }, tags);
	t.deepEqual({ diff: rolled.diff, href: rolled.href }, {
		diff: 'v1.0.0..',
		href: 'https://github.com/user/repo/compare/v1.0.0...v2.0.0',
	});

	const [disabled] = await fetchTags({ ...options, latestVersion: '2.0.0', rollupPrereleasesDisabled: true }, tags);
	t.equal(disabled.diff, 'v2.0.0-rc.1..', 'unless disabled');

	const [prerelease] = await fetchTags({ ...options, latestVersion: '2.0.0-rc.2' }, tags);
	t.equal(prerelease.diff, 'v2.0.0-rc.1..', 'a prerelease does not roll up');

	const [unreleased] = await fetchTags({ ...options, unreleased: true }, gitTags('v1.0.0---2000-01-01\nv2.0.0-rc.1---2000-02-01'));
	t.equal(unreleased.diff, 'v2.0.0-rc.1..', 'unreleased changes do not roll up');
});

test('fetchTags: --release-limit keeps the newest releases', async (t) => {
	const limited = await fetchTags({ ...options, releaseLimit: 2 }, defaultTags);
	t.deepEqual(limited.map(({ title, diff }) => ({ title, diff })), [
		{ title: 'v1.0.0', diff: 'v0.3.0..v1.0.0' },
		{ title: 'v0.3.0', diff: 'v0.2.2..v0.3.0' },
	], 'the oldest shown release still covers its own changes');

	const unreleased = await fetchTags({ ...options, releaseLimit: 2, unreleased: true }, defaultTags);
	t.deepEqual(unreleased.map(({ title }) => title), ['Unreleased', 'v1.0.0'], 'an unreleased section counts');

	const ending = await fetchTags({ ...options, releaseLimit: 2, endingVersion: 'v0.3.0' }, defaultTags);
	t.deepEqual(ending.map(({ title }) => title), ['v0.3.0', 'v0.2.2'], 'after --ending-version');

	const starting = await fetchTags({ ...options, releaseLimit: 5, startingVersion: 'v0.3.0' }, defaultTags);
	t.deepEqual(starting.map(({ title }) => title), ['v1.0.0', 'v0.3.0'], 'within --starting-version');

	const hidingEmpty = await fetchTags({ ...options, releaseLimit: 2, hideEmptyReleases: true }, defaultTags);
	t.equal(hidingEmpty.length, 6, 'not yet, when empty releases are hidden');
});

async function verboseTagLines(t, tagOptions, tags = defaultTags) {
	const { lines } = await captureStderr(t, () => fetchTags({ ...options, verbose: true, ...tagOptions }, tags));
	return lines.filter((line) => !line.startsWith('running '));
}

test('fetchTags: --verbose says which git command it runs', async (t) => {
	const { lines } = await captureStderr(t, () => fetchTags({ ...options, verbose: true, appendGitTag: '' }, defaultTags));
	t.deepEqual(lines, ['running git tag -l --format=%(refname:short)---%(creatordate:short)']);

	const quiet = await captureStderr(t, () => fetchTags({ ...options, appendGitTag: '' }, defaultTags));
	t.deepEqual(quiet.lines, [], 'nothing without --verbose');
});

test('fetchTags: --verbose says which tags are not versions, and why', async (t) => {
	const tags = gitTags(['v1.0.0', 'latest', 'build-7'].map((tag) => `${tag}---2000-01-01`).join('\n'));
	t.deepEqual(await verboseTagLines(t, {}, tags), [
		'ignored tag latest: it is not valid semver',
		'ignored tag build-7: it is not valid semver',
	]);
	t.deepEqual(await verboseTagLines(t, { tagPattern: '^v' }, tags), [
		'ignored tag latest: it does not match `--tag-pattern`',
		'ignored tag build-7: it does not match `--tag-pattern`',
	], '--tag-pattern');
	t.deepEqual(await verboseTagLines(t, { tagPrefix: 'build-' }, gitTags('build-7---2000-01-01\nbuild-x---2000-01-01')), [
		'ignored tag build-x: its version "x" is not valid semver',
	], 'names the version when it differs from the tag');
	t.deepEqual(await verboseTagLines(t, {}, gitTags('')), [], 'no tags at all');
});

test('fetchTags: --verbose lists every tag skipped for lacking the tag prefix', async (t) => {
	const tags = gitTags(['v1.0.0', '1.0.0', '1.1.0', '1.2.0', '1.3.0'].map((tag) => `${tag}---2000-01-01`).join('\n'));
	t.deepEqual(await verboseTagLines(t, { tagPrefix: 'v' }, tags), [
		'skipped 4 version tags without the tag prefix "v" (1.3.0, 1.2.0, 1.1.0, 1.0.0)',
	]);
});

test('fetchTags: --verbose says which releases each option left out', async (t) => {
	t.deepEqual(await verboseTagLines(t, { endingVersion: 'v0.3.0', startingVersion: 'v0.2.1' }), [
		'left out 1 release newer than `--ending-version`: v1.0.0',
		'left out 2 releases older than `--starting-version`: v0.2.0, v0.1.0',
	]);
	t.deepEqual(await verboseTagLines(t, { startingDate: '2000-04-01' }), [
		'left out 4 releases older than `--starting-date`: v0.2.2, v0.2.1, v0.2.0, v0.1.0',
	]);
	t.deepEqual(await verboseTagLines(t, { releaseLimit: 4 }), [
		'left out 2 releases over `--release-limit`: v0.2.0, v0.1.0',
	]);
	t.deepEqual(await verboseTagLines(t, { unreleasedOnly: true }, gitRepo()), [
		'left out 6 releases that are not unreleased (`--unreleased-only`): v1.0.0, v0.3.0, v0.2.2, v0.2.1, v0.2.0, v0.1.0',
	]);
	t.deepEqual(await verboseTagLines(t, { endingVersion: 'v0.2.0', startingVersion: 'v0.3.0' }), [
		'left out 4 releases newer than `--ending-version`: v1.0.0, v0.3.0, v0.2.2, v0.2.1',
		'left out 2 releases older than `--starting-version`: v0.2.0, v0.1.0',
	], 'each release once, when the options cross');
	t.deepEqual(await verboseTagLines(t, {}), [], 'nothing left out');
});

test('fetchTags: an empty --rollup-prereleases-disabled is not a version', async (t) => {
	try {
		await fetchTags({ ...options, rollupPrereleasesDisabled: '' }, PRERELEASE_TAGS);
		t.fail('should reject');
	} catch (error) {
		t.match(error.message, /`--rollup-prereleases-disabled` takes a version, or no value; got ``/);
	}
});

test('fetchTags: with no tag that has the tag prefix, the error suggests a tag pattern for a first release', async (t) => {
	try {
		await fetchTags({ ...options, tagPrefix: '@my.org/pkg@' }, gitTags('v1.0.0---2000-01-01'));
		t.fail('should reject');
	} catch (error) {
		t.match(error.message, /Before a package's first release, use `--tag-pattern '\^@my\\\.org\/pkg@'` in place of the tag prefix \(and `--autodetect-monorepo-disabled` for a monorepo package\)$/);
	}
});
