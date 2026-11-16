'use strict';

const cmd = require('./cmd');
const getLogFormat = require('./log-format');
const {
	COMMIT_SEPARATOR,
	MESSAGE_SEPARATOR,
	parseCommits,
	parseCommit,
} = require('./parse-commits');
const { logVerbose } = require('./utils');

const DEPENDENCIES = { cmd };

async function fetchCommits(diff, options = {}, overrides = {}) {
	const { cmd: command } = { ...DEPENDENCIES, ...overrides };
	const format = await getLogFormat(overrides);
	const logCommand = `git log ${diff} --shortstat --pretty=format:${format} ${options.appendGitLog}`;
	logVerbose(options, `running ${logCommand.trim()}`);
	const log = await command(logCommand);
	return parseCommits(log, options);
}

module.exports = {
	COMMIT_SEPARATOR,
	MESSAGE_SEPARATOR,
	fetchCommits,
	parseCommit,
};
