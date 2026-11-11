'use strict';

const { fetchTags } = require('./tags');
const { parseReleases } = require('./releases');
const { compileTemplate } = require('./template');
const getOptions = require('./options');
const {
	readFile,
	writeFile,
	fileExists,
	updateLog,
	formatBytes,
} = require('./utils');

const PREPEND_TOKEN = '<!-- auto-changelog-above -->';

const DEPENDENCIES = {
	fetchTags,
	parseReleases,
	readFile,
	writeFile,
	fileExists,
};

async function write(changelog, options, log, overrides) {
	const {
		readFile: rF,
		writeFile: wF,
		fileExists: fE,
	} = { ...DEPENDENCIES, ...overrides };
	if (options.stdout) {
		process.stdout.write(changelog);
		return;
	}
	const bytes = formatBytes(Buffer.byteLength(changelog, 'utf8'));
	const existing = await fE(options.output) && await rF(options.output);
	if (existing) {
		const index = options.prepend ? 0 : existing.indexOf(PREPEND_TOKEN);
		if (index !== -1) {
			const prepended = `${changelog}\n${existing.slice(index)}`;
			await wF(options.output, prepended);
			log(`${bytes} prepended to ${options.output}\n`);
			return;
		}
	}
	await wF(options.output, changelog);
	log(`${bytes} written to ${options.output}\n`);
}

async function run(argv, overrides) {
	const { fetchTags: fT, parseReleases: pR } = { ...DEPENDENCIES, ...overrides };
	const options = await getOptions(argv, overrides);
	if (!options) {
		return;
	}
	function log(string) {
		return options.stdout ? null : updateLog(string);
	}
	log('Fetching tags…');
	const tags = await fT(options);
	log(`${tags.length} version tags found…`);
	function onParsed({ title }) {
		return log(`Fetched ${title}…`);
	}
	const releases = await pR(tags, options, onParsed);
	const changelog = await compileTemplate(releases, options);
	await write(changelog, options, log, overrides);
}

module.exports = {
	run,
};
