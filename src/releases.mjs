import { availableParallelism } from 'os';
import semver from 'semver';
import { mapLimit } from 'async';
import { fetchCommits } from './commits.mjs';
import {
	logVerbose,
	logLeftOutReleases,
	logLeftOutCommit,
} from './utils.mjs';

const MERGE_COMMIT_PATTERN = /^Merge (remote-tracking )?branch '.+'/;
const COMMIT_MESSAGE_PATTERN = /\n+([\S\s]+)/;

const DEPENDENCIES = { fetchCommits };

// `leftRelease` says whether it reached a parent that is not one of those commits.
function walkCommits(starts, parentsByHash, stop = new Set()) {
	const reached = new Set();
	const pending = [...starts];
	let leftRelease = false;
	while (pending.length > 0) {
		const hash = pending.pop();
		if (!reached.has(hash) && !stop.has(hash)) {
			if (parentsByHash.has(hash)) {
				reached.add(hash);
				pending.push(...parentsByHash.get(hash));
			} else {
				leftRelease = true;
			}
		}
	}
	return { reached, leftRelease };
}

// A merge brought in the commits reachable from its later parents but not from its first.
// A parent outside the release's commits is normally from an earlier release, which can't
// lead back into this one; but when commits may have been left out of the log, it could
// hide a path, so a commit that can't be ruled out is treated as the merge's, as before.
function getMergeMembership(commits, options) {
	const parentsByHash = new Map(commits.map(({ hash, parents = [] }) => [hash, parents]));
	const logMayBeIncomplete = !!(options.commitPattern ||
		options.ignoreCommitPattern ||
		options.appendGitLog ||
		(options.plugins || []).some((plugin) => plugin.processCommits));
	const cache = new Map();
	return (commit, merge) => {
		const [first, ...later] = (merge.commit && merge.commit.parents) || [];
		if (later.length === 0) {
			return true;
		}
		if (!cache.has(merge)) {
			const { reached: mainline } = walkCommits([first], parentsByHash);
			const { reached: branch, leftRelease } = walkCommits(later, parentsByHash, mainline);
			cache.set(merge, {
				mainline,
				branch,
				unsure: leftRelease && logMayBeIncomplete,
			});
		}
		const {
			mainline,
			branch,
			unsure,
		} = cache.get(merge);
		return !mainline.has(commit.hash) && (branch.has(commit.hash) || unsure);
	};
}

function filterCommits(merges, isPartOfMerge, options) {
	function leaveOut(commit, reason) {
		logLeftOutCommit(options, commit, reason);
		return false;
	}
	return (commit) => {
		if (commit.fixes || commit.merge) {
			// Filter out commits that already appear in fix or merge lists
			return false;
		}
		if (commit.breaking) {
			return true;
		}
		if (semver.valid(commit.subject)) {
			return leaveOut(commit, 'it is a version commit');
		}
		if (MERGE_COMMIT_PATTERN.test(commit.subject)) {
			return leaveOut(commit, 'it is a merge commit');
		}
		const merge = merges.find((m) => m.message === commit.subject && isPartOfMerge(commit, m));
		if (merge) {
			return leaveOut(commit, `it is part of merge #${merge.id}, and repeats its title`);
		}
		return true;
	};
}

// A pull request can be merged more than once, like a squash merge backported to another branch.
// Only a merge with the same number and title as an earlier one is a repeat: a GitLab issue
// number in a squash merge, or a custom merge pattern without a number, can match another's.
function getRepeatedMerges(commits) {
	const seen = new Set();
	return new Set(commits.filter(({ merge }) => {
		if (!merge || !merge.id) {
			return false;
		}
		const key = `${merge.href || merge.id}\n${merge.message}`;
		const repeated = seen.has(key);
		seen.add(key);
		return repeated;
	}));
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
	// Each release runs its own `git log`; running them all at once overwhelms large repositories.
	const releases = await mapLimit(tags, availableParallelism(), async (tag) => {
		const commits = await fetchC(tag.diff, options);
		const repeats = getRepeatedMerges(commits);
		repeats.forEach((commit) => logLeftOutCommit(options, commit, `it repeats merge #${commit.merge.id}`));
		const listed = commits.filter((commit) => !repeats.has(commit));
		const merges = listed.filter((commit) => commit.merge).map((commit) => commit.merge);
		const fixes = listed.filter((commit) => commit.fixes).map((commit) => ({ fixes: commit.fixes, commit }));

		for (const plugin of options.plugins || []) {
			if (plugin.processCommits) { await plugin.processCommits(commits); }
			if (plugin.processMerges) { await plugin.processMerges(merges); }
			if (plugin.processFixes) { await plugin.processFixes(fixes); }
		}

		const emptyRelease = merges.length === 0 && fixes.length === 0;
		const { message } = commits[0] || { message: null };
		const breakingCount = commits.filter((c) => c.breaking).length;
		const sortedCommits = commits
			.filter(filterCommits(merges, getMergeMembership(commits, options), options))
			.sort(sortCommits(options));
		const filteredCommits = sortedCommits.slice(0, getCommitLimit(options, emptyRelease, breakingCount));
		const overLimit = sortedCommits.length - filteredCommits.length;
		if (overLimit > 0) {
			logVerbose(options, `left out ${overLimit} of the ${sortedCommits.length} commits in ${tag.title}: over \`${emptyRelease ? '--backfill-limit' : '--commit-limit'}\``);
		}

		if (onParsed) { onParsed(tag); }

		return {
			...tag,
			summary: getSummary(message, options),
			commits: filteredCommits,
			merges,
			fixes,
		};
	});

	for (const plugin of options.plugins || []) {
		if (plugin.processReleases) { await plugin.processReleases(releases); }
	}

	const isShown = filterReleases(options);
	logLeftOutReleases(options, releases.filter((release) => !isShown(release)), 'with no changes (`--hide-empty-releases`)');
	const shown = releases.filter(isShown);
	const limited = shown.slice(0, options.releaseLimit);
	logLeftOutReleases(options, shown.slice(limited.length), 'over `--release-limit`');
	return limited;
}

export {
	parseReleases,
};
