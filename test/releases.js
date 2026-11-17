'use strict';

const test = require('tape');
const { availableParallelism } = require('os');
const remotes = require('./data/remotes');
const { generateCommits } = require('./utils/commits');
const { parseReleases } = require('../src/releases');
const { getRemote } = require('../src/remote');
const { captureStderr } = require('./utils/stderr');

function commitsFrom(map) {
	return { fetchCommits: (diff) => Promise.resolve(map[diff]) };
}

test('parseReleases: parses releases', async (t) => {
	const map = {
		'v1.0.0..v2.0.0': generateCommits([
			'Merge pull request #4 from branch\n\nSixth commit',
			'Fifth commit\nFixes #3',
			'Fourth commit',
		]),
		'v1.0.0': generateCommits([
			'Merge pull request #2 from branch\n\nThird commit',
			'Second commit\nFixes #1',
			'First commit',
		]),
	};
	const options = {
		commitLimit: 3,
		backfillLimit: 3,
		tagPrefix: '',
		latestVersion: null,
		...remotes.github,
	};
	const tags = [
		{
			tag: 'v2.0.0',
			date: '2000-01-01',
			diff: 'v1.0.0..v2.0.0',
			major: true,
			href: 'https://github.com/user/repo/compare/v1.0.0...v2.0.0',
		},
		{
			tag: 'v1.0.0',
			date: '2000-01-01',
			diff: 'v1.0.0',
			major: false,
			href: null,
		},
	];
	const releases = await parseReleases(tags, options, null, commitsFrom(map));
	t.ok(Array.isArray(releases));
	t.equal(releases[0].tag, 'v2.0.0');
	t.equal(releases[0].major, true);
	t.equal(releases[0].href, 'https://github.com/user/repo/compare/v1.0.0...v2.0.0');
	t.equal(releases[0].commits.length, 1);
	t.equal(releases[0].commits[0].subject, 'Fourth commit');
	t.equal(releases[1].tag, 'v1.0.0');
	t.equal(releases[1].major, false);
	t.equal(releases[1].href, null);
	t.equal(releases[1].commits.length, 1);
	t.equal(releases[1].commits[0].subject, 'First commit');
});

test('parseReleases: applies commitLimit', async (t) => {
	const map = {
		'v1.0.0': generateCommits(['Second commit', 'First commit\nFixes #1']),
	};
	const options = { commitLimit: 1 };
	const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }];
	const releases = await parseReleases(tags, options, null, commitsFrom(map));
	t.equal(releases[0].commits.length, 1);
	t.equal(releases[0].commits[0].subject, 'Second commit');
});

test('parseReleases: false commitLimit', async (t) => {
	const map = {
		'v1.0.0': generateCommits(['Fourth commit', 'Third commit', 'Second commit', 'First commit']),
	};
	const options = { commitLimit: false };
	const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }];
	const releases = await parseReleases(tags, options, null, commitsFrom(map));
	t.equal(releases[0].commits.length, 4);
});

test('parseReleases: applies backfillLimit', async (t) => {
	const map = {
		'v1.0.0': generateCommits(['Second commit', 'First commit']),
	};
	const options = { backfillLimit: 1 };
	const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }];
	const releases = await parseReleases(tags, options, null, commitsFrom(map));
	t.equal(releases[0].commits.length, 1);
	t.equal(releases[0].commits[0].subject, 'Second commit');
});

test('parseReleases: false backfillLimit', async (t) => {
	const map = {
		'v1.0.0': generateCommits(['Fourth commit', 'Third commit', 'Second commit', 'First commit']),
	};
	const options = { commitLimit: 3, backfillLimit: false };
	const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }];
	const releases = await parseReleases(tags, options, null, commitsFrom(map));
	t.equal(releases[0].commits.length, 4);
});

test('parseReleases: includes breaking commits', async (t) => {
	const map = {
		'v1.0.0': generateCommits([
			{ message: 'Second commit' },
			{ message: 'First commit', breaking: true },
		]),
	};
	const options = { commitLimit: 0, backfillLimit: 0 };
	const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }];
	const releases = await parseReleases(tags, options, null, commitsFrom(map));
	t.equal(releases[0].commits.length, 1);
	t.equal(releases[0].commits[0].subject, 'First commit');
});

test('parseReleases: passes fixes to the processFixes plugin hook', async (t) => {
	const map = {
		'v1.0.0': generateCommits([
			'Merge pull request #2 from branch\n\nSecond commit',
			'First commit\nFixes #1',
		]),
	};
	const received = {};
	const plugin = {
		processMerges(merges) { received.merges = merges; },
		processFixes(fixes) { received.fixes = fixes; },
	};
	const options = {
		commitLimit: 3,
		backfillLimit: 3,
		plugins: [plugin],
		...remotes.github,
	};
	const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }];
	await parseReleases(tags, options, null, commitsFrom(map));
	t.equal(received.fixes.length, 1);
	t.equal(received.fixes[0].fixes[0].id, '1');
	t.equal(received.merges.length, 1);
	t.equal(received.merges[0].id, '2');
});

test('parseReleases: sorts commits with no stats by relevance', async (t) => {
	const map = {
		'v1.0.0': generateCommits([
			{ message: 'Empty commit' },
			{ message: 'Big commit', insertions: 400, deletions: 0 },
			{ message: 'Small commit', insertions: 1, deletions: 0 },
		]),
	};
	const options = { commitLimit: 2, backfillLimit: 2, ...remotes.github };
	const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }];
	const releases = await parseReleases(tags, options, null, commitsFrom(map));
	t.equal(releases[0].commits.length, 2);
	t.equal(releases[0].commits[0].subject, 'Big commit');
	t.equal(releases[0].commits[1].subject, 'Small commit');
});

// Newest first. `tag` is the previous release, so it is not among the release's commits.
// PR #10 branched inside the release, from `after`; PR #11 branched before it, from `tag`.
const MERGE_HISTORY = [
	{ hash: 'later-direct-old', parents: ['later-direct-test1'], message: 'old title' },
	{ hash: 'later-direct-test1', parents: ['merge-11'], message: 'test1' },
	{
		hash: 'merge-11',
		parents: ['merge-10', 'pr-11-commit'],
		message: 'Merge pull request #11 from user/old\n\nold title',
	},
	{ hash: 'pr-11-commit', parents: ['tag'], message: 'old title' },
	{
		hash: 'merge-10',
		parents: ['direct-test1', 'pr-10-tip'],
		message: 'Merge pull request #10 from user/feat\n\ntest1',
	},
	{ hash: 'direct-test1', parents: ['after'], message: 'test1' },
	{ hash: 'pr-10-tip', parents: ['pr-10-first'], message: 'test1' },
	{ hash: 'pr-10-first', parents: ['after'], message: 'pr commit one' },
	{ hash: 'after', parents: ['tag'], message: 'after release' },
];

async function getShownHashes(options) {
	const map = { 'v1.0.0..v2.0.0': generateCommits(MERGE_HISTORY) };
	const tags = [{ tag: 'v2.0.0', date: '2000-01-01', diff: 'v1.0.0..v2.0.0' }];
	const allOptions = {
		commitLimit: false,
		...remotes.github,
		...options,
	};
	const [release] = await parseReleases(tags, allOptions, null, commitsFrom(map));
	return {
		merges: release.merges.map(({ id }) => id),
		commits: release.commits.map(({ hash }) => hash).sort(),
	};
}

test('parseReleases: hides only a merge\'s own commits that repeat its message', async (t) => {
	t.deepEqual(await getShownHashes({}), {
		merges: ['11', '10'],
		commits: [
			'after',
			'direct-test1',
			'later-direct-old',
			'later-direct-test1',
			'pr-10-first',
		],
	}, 'commits with a pull request title that were not part of that pull request are listed');
});

test('parseReleases: when commits may be missing from the log, keeps hiding what it can\'t rule out', async (t) => {
	const expected = {
		merges: ['11', '10'],
		commits: [
			'after',
			'direct-test1',
			'later-direct-test1',
			'pr-10-first',
		],
	};
	t.deepEqual(await getShownHashes({ ignoreCommitPattern: 'unmatched' }), expected, '--ignore-commit-pattern');
	t.deepEqual(await getShownHashes({ commitPattern: '' }), await getShownHashes({}), 'an empty --commit-pattern filters nothing');
	t.deepEqual(await getShownHashes({ appendGitLog: '--no-merges' }), expected, '--append-git-log');
	t.deepEqual(await getShownHashes({ plugins: [{ processCommits(commits) { return commits; } }] }), expected, 'a processCommits plugin');
});

test('parseReleases: without parents, hides every commit that repeats a merge\'s message', async (t) => {
	const map = {
		'v1.0.0': generateCommits([
			'Squashed title (#5)',
			'Squashed title',
			'Plugin title',
			'Other commit',
		]),
	};
	const plugin = {
		processCommits(commits) { commits.push({ hash: 'plugin-commit', subject: 'Plugin commit' }); },
		processMerges(merges) { merges.push({ id: '6', message: 'Plugin title' }); },
	};
	const options = {
		commitLimit: false,
		plugins: [plugin],
		...remotes.github,
	};
	const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }];
	const [release] = await parseReleases(tags, options, null, commitsFrom(map));
	t.deepEqual(release.commits.map(({ subject }) => subject).sort(), ['Other commit', 'Plugin commit']);
});

test('parseReleases: hides empty releases', async (t) => {
	const map = {
		'v1.0.0': [],
	};
	const options = { hideEmptyReleases: true };
	const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }];
	const releases = await parseReleases(tags, options, null, commitsFrom(map));
	t.equal(releases.length, 0);
});

test('parseReleases: limits how many releases fetch commits at once, and keeps their order', async (t) => {
	const limit = availableParallelism();
	const tags = Array.from({ length: limit * 3 }, (_, i) => ({ tag: `v1.0.${i}`, date: '2000-01-01', diff: `v1.0.${i}` }));
	let running = 0;
	let maxRunning = 0;
	async function fetchCommits(diff) {
		running += 1;
		maxRunning = Math.max(maxRunning, running);
		await new Promise((resolve) => { setTimeout(resolve, tags.length - Number(diff.split('.')[2])); });
		running -= 1;
		return generateCommits([`Commit for ${diff}`]);
	}
	const releases = await parseReleases(tags, { commitLimit: 3 }, null, { fetchCommits });
	t.equal(maxRunning, limit, `at most ${limit} at once`);
	t.deepEqual(releases.map(({ tag }) => tag), tags.map(({ tag }) => tag), 'in tag order, though later ones finish first');
});

test('parseReleases: --release-limit counts releases after hiding empty ones', async (t) => {
	const map = {
		'v3.0.0': [],
		'v2.0.0': generateCommits(['Second commit']),
		'v1.0.0': generateCommits(['First commit']),
		'v0.1.0': generateCommits(['Initial commit']),
	};
	const tags = Object.keys(map).map((tag) => ({ tag, date: '2000-01-01', diff: tag }));
	const limits = { commitLimit: 3, backfillLimit: 3, releaseLimit: 2 };
	const hidden = await parseReleases(tags, { ...limits, hideEmptyReleases: true }, null, commitsFrom(map));
	t.deepEqual(hidden.map(({ tag }) => tag), ['v2.0.0', 'v1.0.0']);

	const shown = await parseReleases(tags, limits, null, commitsFrom(map));
	t.deepEqual(shown.map(({ tag }) => tag), ['v3.0.0', 'v2.0.0'], 'empty releases count when shown');
});

async function verboseReleaseLines(t, map, options) {
	const tags = Object.keys(map).map((tag) => ({
		tag,
		title: tag,
		date: '2000-01-01',
		diff: tag,
	}));
	const allOptions = {
		...remotes.github,
		...options,
		verbose: true,
	};
	return (await captureStderr(t, () => parseReleases(tags, allOptions, null, commitsFrom(map)))).lines;
}

test('parseReleases: --verbose says which commits were left out, and why', async (t) => {
	const commits = generateCommits([
		{ hash: 'a'.repeat(40), message: 'Merge pull request #4 from user/branch\n\nAdd thing' },
		{ hash: 'b'.repeat(40), parents: ['c'.repeat(40)], message: 'Add thing' },
		{ hash: 'c'.repeat(40), message: '1.2.3' },
		{ hash: 'd'.repeat(40), message: 'Merge branch \'main\' into feature' },
		{ hash: 'e'.repeat(40), message: 'Fix thing\n\nFixes #1' },
		{ hash: 'f'.repeat(40), message: 'Kept' },
	]);
	commits[0].merge.commit.parents = ['c'.repeat(40), 'b'.repeat(40)];
	t.deepEqual(await verboseReleaseLines(t, { 'v1.0.0': commits }, { commitLimit: false }), [
		'left out commit bbbbbbb "Add thing": it is part of merge #4, and repeats its title',
		'left out commit ccccccc "1.2.3": it is a version commit',
		'left out commit ddddddd "Merge branch \'main\' into feature": it is a merge commit',
	], 'commits listed as merges or fixes are not left out');
});

test('parseReleases: --verbose says how many commits a limit left out', async (t) => {
	const map = {
		'v2.0.0': generateCommits(['Merge pull request #2 from user/branch\n\nTitle', 'One', 'Two', 'Three']),
		'v1.0.0': generateCommits(['One', 'Two', 'Three']),
	};
	t.deepEqual(await verboseReleaseLines(t, map, { commitLimit: 1, backfillLimit: 2 }), [
		'left out 2 of the 3 commits in v2.0.0: over `--commit-limit`',
		'left out 1 of the 3 commits in v1.0.0: over `--backfill-limit`',
	]);
	t.deepEqual(await verboseReleaseLines(t, map, { commitLimit: false }), [], 'no limit');
});

test('parseReleases: --verbose says which releases were hidden or over the limit', async (t) => {
	const map = {
		'v3.0.0': [],
		'v2.0.0': generateCommits(['Second commit']),
		'v1.0.0': generateCommits(['First commit']),
		'v0.1.0': generateCommits(['Initial commit']),
	};
	t.deepEqual(await verboseReleaseLines(t, map, {
		commitLimit: 3,
		backfillLimit: 3,
		releaseLimit: 2,
		hideEmptyReleases: true,
	}), [
		'left out 1 release with no changes (`--hide-empty-releases`): v3.0.0',
		'left out 1 release over `--release-limit`: v0.1.0',
	]);
});

test('parseReleases: lists a pull request merged more than once only once', async (t) => {
	const map = {
		'v1.0.0': generateCommits([
			'Fix a thing (#5)',
			'Add another thing (#6)',
			'Fix a thing (#5)',
			'Merge pull request #5 from user/branch\n\nFix a thing',
		]),
	};
	const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }];
	const [release] = await parseReleases(tags, { commitLimit: false, ...remotes.github }, null, commitsFrom(map));
	t.deepEqual(release.merges.map(({ id, message }) => `${id} ${message}`), ['5 Fix a thing', '6 Add another thing']);
	t.deepEqual(release.commits, [], 'and the repeats are not listed as commits');

	const unlinked = { 'v1.0.0': generateCommits(['Fix a thing (#5)', 'Fix a thing (#5)'], {}, remotes.null) };
	const [noRemote] = await parseReleases(tags, { commitLimit: false, ...remotes.null }, null, commitsFrom(unlinked));
	t.deepEqual(noRemote.merges.map(({ id, href }) => [id, href]), [['5', null]], 'without links, by number');
});

test('parseReleases: only a merge with the same number and title is a repeat', async (t) => {
	const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }];
	const gitlab = getRemote('https://gitlab.com/o/r');
	const map = {
		'v1.0.0': generateCommits([
			'Handle empty input (#12)',
			'Merge branch \'feat\' into \'main\'\n\nAdd dark mode\n\nSee merge request o/r!12',
		], {}, gitlab),
	};
	const [release] = await parseReleases(tags, { commitLimit: false, ...gitlab }, null, commitsFrom(map));
	t.deepEqual(release.merges.map(({ message }) => message).sort(), ['Add dark mode', 'Handle empty input'], 'a GitLab issue number and a merge request number');

	const custom = { mergePattern: '^Feature: ([a-z]+)' };
	const customMap = { 'v1.0.0': generateCommits(['Feature: alpha', 'Feature: beta'], {}, { ...remotes.github, ...custom }) };
	const customOptions = { commitLimit: false, ...custom, ...remotes.github };
	const [customRelease] = await parseReleases(tags, customOptions, null, commitsFrom(customMap));
	t.equal(customRelease.merges.length, 2, 'a custom merge pattern without a number');
});

test('parseReleases: a repeated merge\'s fixes are not listed again, and --verbose says it was left out', async (t) => {
	const tags = [{ tag: 'v1.0.0', title: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }];
	const map = {
		'v1.0.0': generateCommits([
			{ hash: 'a'.repeat(40), message: 'Fix X (#5)\n\nFixes #3\n\n(cherry picked from commit bbb)' },
			{ hash: 'b'.repeat(40), message: 'Fix X (#5)\n\nFixes #3' },
		]),
	};
	const { result: [release], lines } = await captureStderr(t, () => parseReleases(tags, {
		commitLimit: false,
		verbose: true,
		...remotes.github,
	}, null, commitsFrom(map)));
	t.equal(release.merges.length, 1, 'one merge');
	t.deepEqual(release.fixes.map(({ commit }) => commit.hash), ['a'.repeat(40)], 'one fix');
	t.deepEqual(lines, ['left out commit bbbbbbb "Fix X (#5)": it repeats merge #5']);
});

test('parseReleases: --sort-commits orders the commits, after breaking changes', async (t) => {
	const map = {
		'v1.0.0': generateCommits([
			{ message: 'Delta', breaking: true },
			{ message: 'Alpha', date: '2000-01-02 00:00:00 +0000', insertions: 3 },
			{ message: 'Bravo', date: '2000-01-03 00:00:00 +0000', insertions: 1 },
			{ message: 'Charlie', date: '2000-01-01 00:00:00 +0000', insertions: 2 },
		]),
	};
	const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }];
	async function sortedBy(sortCommits) {
		const options = { commitLimit: false, sortCommits, ...remotes.github };
		const [release] = await parseReleases(tags, options, null, commitsFrom(map));
		return release.commits.map(({ subject }) => subject);
	}
	t.deepEqual(await sortedBy('relevance'), ['Delta', 'Alpha', 'Charlie', 'Bravo'], 'relevance');
	t.deepEqual(await sortedBy('date'), ['Delta', 'Charlie', 'Alpha', 'Bravo'], 'date');
	t.deepEqual(await sortedBy('date-desc'), ['Delta', 'Bravo', 'Alpha', 'Charlie'], 'date-desc');
	t.deepEqual(await sortedBy('subject'), ['Delta', 'Alpha', 'Bravo', 'Charlie'], 'subject');
	t.deepEqual(await sortedBy('subject-desc'), ['Delta', 'Charlie', 'Bravo', 'Alpha'], 'subject-desc');
});

test('parseReleases: --release-summary uses the body of a release\'s newest commit', async (t) => {
	const map = {
		'v1.0.0..v2.0.0': generateCommits(['2.0.0\n\nThe summary\n\n- a point', 'Other commit']),
		'v1.0.0': generateCommits(['1.0.0']),
	};
	const tags = [
		{ tag: 'v2.0.0', date: '2000-02-01', diff: 'v1.0.0..v2.0.0' },
		{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' },
	];
	const summaries = await parseReleases(tags, { releaseSummary: true, ...remotes.github }, null, commitsFrom(map));
	t.deepEqual(summaries.map(({ summary }) => summary), ['The summary\n\n- a point', null], 'none without a body');
	const off = await parseReleases(tags, remotes.github, null, commitsFrom(map));
	t.deepEqual(off.map(({ summary }) => summary), [null, null], 'none without --release-summary');
});

test('parseReleases: a plugin can process the releases', async (t) => {
	const map = { 'v1.0.0': generateCommits(['First commit']) };
	const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }];
	let received;
	const plugin = {
		processReleases(releases) { received = releases.map(({ tag }) => tag); },
	};
	await parseReleases(tags, { plugins: [plugin], ...remotes.github }, null, commitsFrom(map));
	t.deepEqual(received, ['v1.0.0']);
});
