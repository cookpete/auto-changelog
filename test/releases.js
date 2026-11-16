'use strict';

const test = require('tape');
const { availableParallelism } = require('os');
const remotes = require('./data/remotes');
const { generateCommits } = require('./utils/commits');
const { parseReleases } = require('../src/releases');

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
