'use strict';

const readline = require('readline');
const fs = require('fs');
const cmd = require('./cmd');

const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

// Every function reaching outside the process takes a trailing overrides object, so
// callers - tests above all - can substitute a collaborator without patching the module.
const DEPENDENCIES = { cmd, fs };

function updateLog(string, clearLine = true) {
	if (clearLine) {
		readline.clearLine(process.stdout);
		readline.cursorTo(process.stdout, 0);
	}
	process.stdout.write(`auto-changelog: ${string}`);
}

function formatBytes(bytes) {
	return `${Math.max(1, Math.round(bytes / 1024))} kB`;
}

async function getGitVersion(overrides) {
	const { cmd } = { ...DEPENDENCIES, ...overrides };
	const output = await cmd('git --version');
	const match = output.match(/\d+\.\d+\.\d+/);
	return match ? match[0] : null;
}

function niceDate(string) {
	const date = new Date(string);
	const day = date.getUTCDate();
	const month = MONTH_NAMES[date.getUTCMonth()];
	const year = date.getUTCFullYear();
	return `${day} ${month} ${year}`;
}

function isLink(string) {
	return (/^http/).test(string);
}

function isURL(string) {
	return (/^https?:\/\/.+/).test(string);
}

function encodeHTML(string) {
	return string.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function replaceText(string, options) {
	if (!options.replaceText) {
		return string;
	}
	return Object.keys(options.replaceText).reduce(
		(string, pattern) => string.replace(new RegExp(pattern, 'g'), options.replaceText[pattern]),
		string,
	);
}

function createCallback(resolve, reject) {
	return (err, data) => {
		if (err) {
			reject(err);
		} else {
			resolve(data);
		}
	};
}

function readFile(path, overrides) {
	const { fs } = { ...DEPENDENCIES, ...overrides };
	return new Promise((resolve, reject) => {
		fs.readFile(path, 'utf-8', createCallback(resolve, reject));
	});
}

function writeFile(path, data, overrides) {
	const { fs } = { ...DEPENDENCIES, ...overrides };
	return new Promise((resolve, reject) => {
		fs.writeFile(path, data, createCallback(resolve, reject));
	});
}

function fileExists(path, overrides) {
	const { fs } = { ...DEPENDENCIES, ...overrides };
	return new Promise((resolve) => {
		fs.access(path, (err) => resolve(!err));
	});
}

async function readJson(path, overrides) {
	if (await fileExists(path, overrides) === false) {
		return null;
	}
	return JSON.parse(await readFile(path, overrides));
}

module.exports = {
	updateLog,
	formatBytes,
	cmd,
	getGitVersion,
	niceDate,
	isLink,
	isURL,
	encodeHTML,
	replaceText,
	readFile,
	writeFile,
	fileExists,
	readJson,
};
