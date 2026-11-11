'use strict';

const cmd = require('./cmd');
const getLogFormat = require('./log-format');
const {
	COMMIT_SEPARATOR,
	MESSAGE_SEPARATOR,
	parseCommits,
	parseCommit,
} = require('./parse-commits');

const DEPENDENCIES = { cmd };

async function fetchCommits(diff, options = {}, overrides) {
	const { cmd } = { ...DEPENDENCIES, ...overrides };
	const format = await getLogFormat(overrides);
	const log = await cmd(`git log ${diff} --shortstat --pretty=format:${format} ${options.appendGitLog}`);
	return parseCommits(log, options);
}

module.exports = {
	COMMIT_SEPARATOR,
	MESSAGE_SEPARATOR,
	fetchCommits,
	parseCommit,
};
