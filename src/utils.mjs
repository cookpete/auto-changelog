import readline from 'readline';
import fs from 'fs';
import cmd from './cmd.mjs';

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
	if (clearLine && process.stderr.isTTY) {
		readline.clearLine(process.stderr);
		readline.cursorTo(process.stderr, 0);
	}
	process.stderr.write(`auto-changelog: ${string}`);
}

function logVerbose({ verbose }, string) {
	if (verbose) {
		updateLog(`${string}\n`);
	}
}

function plural(count, noun) {
	return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function logLeftOutReleases(options, releases, reason) {
	if (releases.length > 0) {
		logVerbose(options, `left out ${plural(releases.length, 'release')} ${reason}: ${releases.map(({ title }) => title).join(', ')}`);
	}
}

function logLeftOutCommit(options, { shorthash, subject }, reason) {
	logVerbose(options, `left out commit ${shorthash} "${subject}": ${reason}`);
}

function formatBytes(bytes) {
	return `${Math.max(1, Math.round(bytes / 1024))} kB`;
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
		(str, pattern) => str.replace(new RegExp(pattern, 'g'), options.replaceText[pattern]),
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
	const { fs: fsInj } = { ...DEPENDENCIES, ...overrides };
	return new Promise((resolve, reject) => {
		fsInj.readFile(path, 'utf-8', createCallback(resolve, reject));
	});
}

function writeFile(path, data, overrides) {
	const { fs: fsInj } = { ...DEPENDENCIES, ...overrides };
	return new Promise((resolve, reject) => {
		fsInj.writeFile(path, data, createCallback(resolve, reject));
	});
}

function fileExists(path, overrides) {
	const { fs: fsInj } = { ...DEPENDENCIES, ...overrides };
	return new Promise((resolve) => {
		fsInj.access(path, (err) => resolve(!err));
	});
}

async function readJson(path, overrides) {
	if (await fileExists(path, overrides) === false) {
		return null;
	}
	const contents = await readFile(path, overrides);
	try {
		return JSON.parse(contents);
	} catch (e) {
		throw new SyntaxError(`Invalid JSON in ${path}: ${e.message}`, { cause: e });
	}
}

export {
	updateLog,
	logVerbose,
	logLeftOutReleases,
	logLeftOutCommit,
	formatBytes,
	cmd,
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
