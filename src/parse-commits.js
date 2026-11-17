'use strict';

const {
	isLink,
	encodeHTML,
	niceDate,
	replaceText,
	logLeftOutCommit,
} = require('./utils');

const COMMIT_SEPARATOR = '__AUTO_CHANGELOG_COMMIT_SEPARATOR__';
const MESSAGE_SEPARATOR = '__AUTO_CHANGELOG_MESSAGE_SEPARATOR__';
const MATCH_COMMIT = /(.*)\n(.*)\n(.*)\n(.*)\n([\S\s]+)/;
const MATCH_STATS = /(\d+) files? changed(?:, (\d+) insertions?...)?(?:, (\d+) deletions?...)?/;

// https://help.github.com/articles/closing-issues-via-commit-messages
const DEFAULT_FIX_PATTERN = /(?:close[sd]?|fixe?[sd]?|resolve[sd]?)\s(?:#(\d+)|(https?:\/\/.+?\/(?:issues|pull|pull-requests|merge_requests)\/(\d+)))/gi;

const MERGE_PATTERNS = [
	/^Merge pull request #(\d+) from .+\n\n(.+)/, // Regular GitHub merge
	/^(.+) \(#(\d+)\)(?:\n*$|\n\n)/, // Github squash merge
	/^Merged in .+ \(pull request #(\d+)\)\n\n(.+)/, // BitBucket merge
	/^Merge branch .+ into .+\n\n(.+)[\S\s]+See merge request [^!]*!(\d+)/, // GitLab merge
];

function filterCommit(commit, options) {
	const { ignoreCommitPattern, commitPattern } = options;
	if (ignoreCommitPattern) {
		const ignore = new RegExp(ignoreCommitPattern);
		if (ignore.test(commit.subject) || (commit.merge && ignore.test(commit.merge.message))) {
			logLeftOutCommit(options, commit, 'it matches `--ignore-commit-pattern`');
			return false;
		}
	}
	if (commitPattern && !new RegExp(commitPattern).test(commit.subject)) {
		logLeftOutCommit(options, commit, 'it does not match `--commit-pattern`');
		return false;
	}
	return true;
}

function getSubject(message) {
	if (!message.trim()) {
		return '_No commit message_';
	}
	return message.match(/[^\n]+/)[0].trim();
}

function getFixPattern(options) {
	if (options.issuePattern) {
		return new RegExp(options.issuePattern, 'g');
	}
	return DEFAULT_FIX_PATTERN;
}

// A full link to one of this repository's own issues or pull requests, which can differ in
// letter case (like an owner's capitalization) from the remote's, is spelled like the remote's links.
function getFixLink(url, id, { getIssueLink, getMergeLink }) {
	const ownLinks = [getIssueLink, getMergeLink].map((getLink) => getLink && getLink(id));
	return ownLinks.find((link) => link && link.toLowerCase() === url.toLowerCase()) || url;
}

function getFixes(message, author, options) {
	const pattern = getFixPattern(options);
	const fixes = [];
	let match = pattern.exec(message);
	if (!match) { return null; }
	while (match) {
		// The last captured value, or the whole match
		const id = match.findLast((value) => value);
		const href = isLink(match[2]) ? getFixLink(match[2], id, options) : options.getIssueLink(id);
		if (!fixes.some((fix) => fix.id === id && fix.href === href)) {
			fixes.push({
				id,
				href,
				author,
			});
		}
		match = pattern.exec(message);
	}
	return fixes;
}

function getMergePatterns(options) {
	if (options.mergePattern) {
		return MERGE_PATTERNS.concat(new RegExp(options.mergePattern, 'g'));
	}
	return MERGE_PATTERNS;
}

function getMerge(commit, message, options) {
	const patterns = getMergePatterns(options);
	for (const pattern of patterns) {
		const match = pattern.exec(message);
		if (match) {
			const id = (/^\d+$/).test(match[1]) ? match[1] : match[2];
			const msg = (/^\d+$/).test(match[1]) ? match[2] : match[1];
			return {
				id,
				message: replaceText(msg, options),
				href: options.getMergeLink(id),
				author: commit.author,
				commit,
			};
		}
	}
	return null;
}

function getStats(stats) {
	if (!stats.trim()) { return {}; }
	const [
		,
		files,
		insertions,
		deletions,
	] = stats.match(MATCH_STATS);
	return {
		files: parseInt(files, 10),
		insertions: parseInt(insertions || 0, 10),
		deletions: parseInt(deletions || 0, 10),
	};
}

function parseCommit(commit, options) {
	const [
		,
		hashes,
		date,
		author,
		email,
		tail,
	] = commit.match(MATCH_COMMIT);
	const [hash, ...parents] = hashes.split(' ').filter(Boolean);
	const [body, stats] = tail.split(MESSAGE_SEPARATOR);
	const message = encodeHTML(body);
	const parsed = {
		hash,
		parents,
		shorthash: hash.slice(0, 7),
		author,
		email,
		date: new Date(date).toISOString(),
		niceDate: niceDate(date),
		subject: replaceText(getSubject(message), options),
		message: replaceText(message.trim(), options),
		rawMessage: message.trim(),
		fixes: getFixes(message, author, options),
		href: options.getCommitLink(hash),
		breaking: !!options.breakingPattern && new RegExp(options.breakingPattern).test(message),
		...getStats(stats),
	};
	return {
		...parsed,
		merge: getMerge(parsed, message, options),
	};
}

function parseCommits(string, options) {
	return string
		.split(COMMIT_SEPARATOR)
		.slice(1)
		.map((commit) => parseCommit(commit, options))
		.filter((commit) => filterCommit(commit, options));
}

module.exports = {
	COMMIT_SEPARATOR,
	MESSAGE_SEPARATOR,
	parseCommits,
	parseCommit,
	getSubject,
	getFixes,
	getMerge,
};
