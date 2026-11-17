'use strict';

const cmd = require('./cmd');
const {
	COMMIT_SEPARATOR,
	MESSAGE_SEPARATOR,
	parseCommits,
	parseCommit,
} = require('./parse-commits');
const { logVerbose } = require('./utils');

// `cmd` splits its command on spaces, so the space between the hash and its parents is escaped.
const LOG_FORMAT = `${COMMIT_SEPARATOR}%H%x20%P%n%ai%n%an%n%ae%n%B${MESSAGE_SEPARATOR}`;

const DEPENDENCIES = { cmd };

async function fetchCommits(diff, options = {}, overrides = {}) {
	const { cmd: command } = { ...DEPENDENCIES, ...overrides };
	// Without any tags, unreleased changes are everything up to `HEAD`, which a new repository doesn't have yet.
	if (diff === 'HEAD' && !(await command('git rev-parse -q --verify HEAD').catch(() => '')).trim()) {
		return [];
	}
	const logCommand = `git log ${diff} --shortstat --pretty=format:${LOG_FORMAT} ${options.appendGitLog}`;
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
