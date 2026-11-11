'use strict';

const semver = require('semver');
const { fetchCommits } = require('./commits');

const MERGE_COMMIT_PATTERN = /^Merge (remote-tracking )?branch '.+'/;
const COMMIT_MESSAGE_PATTERN = /\n+([\S\s]+)/;

const DEPENDENCIES = { fetchCommits };

function filterCommits(merges) {
	return (commit) => {
		if (commit.fixes || commit.merge) {
			// Filter out commits that already appear in fix or merge lists
			return false;
		}
		if (commit.breaking) {
			return true;
		}
		if (semver.valid(commit.subject)) {
			// Filter out version commits
			return false;
		}
		if (MERGE_COMMIT_PATTERN.test(commit.subject)) {
			// Filter out merge commits
			return false;
		}
		if (merges.findIndex((m) => m.message === commit.subject) !== -1) {
			// Filter out commits with the same message as an existing merge
			return false;
		}
		return true;
	};
}

function getRelevance({ insertions = 0, deletions = 0 }) {
	return insertions + deletions;
}

function sortCommits({ sortCommits: sC }) {
	return (a, b) => {
		if (!a.breaking && b.breaking) { return 1; }
		if (a.breaking && !b.breaking) { return -1; }
		if (sC === 'date') { return new Date(a.date) - new Date(b.date); }
		if (sC === 'date-desc') { return new Date(b.date) - new Date(a.date); }
		if (sC === 'subject') { return a.subject.localeCompare(b.subject); }
		if (sC === 'subject-desc') { return b.subject.localeCompare(a.subject); }
		return getRelevance(b) - getRelevance(a);
	};
}

function filterReleases(options) {
	return ({
		merges,
		fixes,
		commits,
	}) => {
		if (options.hideEmptyReleases && (merges.length + fixes.length + commits.length) === 0) {
			return false;
		}
		return true;
	};
}

function getCommitLimit({ commitLimit, backfillLimit }, emptyRelease, breakingCount) {
	const limit = emptyRelease ? backfillLimit : commitLimit;
	if (commitLimit === false || limit === false) {
		return undefined; // Return all commits
	}
	return Math.max(breakingCount, limit);
}

function getSummary(message, { releaseSummary }) {
	if (!message || !releaseSummary) {
		return null;
	}
	if (COMMIT_MESSAGE_PATTERN.test(message)) {
		return message.match(COMMIT_MESSAGE_PATTERN)[1];
	}
	return null;
}

async function parseReleases(tags, options, onParsed, overrides) {
	const { fetchCommits: fetchC } = { ...DEPENDENCIES, ...overrides };
	const releases = await Promise.all(tags.map(async (tag) => {
		const commits = await fetchC(tag.diff, options);
		const merges = commits.filter((commit) => commit.merge).map((commit) => commit.merge);
		const fixes = commits.filter((commit) => commit.fixes).map((commit) => ({ fixes: commit.fixes, commit }));

		for (const plugin of options.plugins || []) {
			if (plugin.processCommits) { await plugin.processCommits(commits); }
			if (plugin.processMerges) { await plugin.processMerges(merges); }
			if (plugin.processFixes) { await plugin.processFixes(fixes); }
		}

		const emptyRelease = merges.length === 0 && fixes.length === 0;
		const { message } = commits[0] || { message: null };
		const breakingCount = commits.filter((c) => c.breaking).length;
		const filteredCommits = commits
			.filter(filterCommits(merges))
			.sort(sortCommits(options))
			.slice(0, getCommitLimit(options, emptyRelease, breakingCount));

		if (onParsed) { onParsed(tag); }

		return {
			...tag,
			summary: getSummary(message, options),
			commits: filteredCommits,
			merges,
			fixes,
		};
	}));

	for (const plugin of options.plugins || []) {
		if (plugin.processReleases) { await plugin.processReleases(releases); }
	}

	return releases.filter(filterReleases(options));
}

module.exports = {
	parseReleases,
};
