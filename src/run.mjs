import { fetchTags } from './tags.mjs';
import { parseReleases } from './releases.mjs';
import { compileTemplate } from './template.mjs';
import getOptions from './options.mjs';
import {
	readFile,
	writeFile,
	fileExists,
	updateLog,
	formatBytes,
} from './utils.mjs';

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
	// Progress messages without a newline are replaced by the next one, which only a terminal can do.
	function log(string) {
		const transient = !string.endsWith('\n');
		return options.stdout || (transient && !process.stderr.isTTY) ? null : updateLog(string);
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

export {
	run,
};
