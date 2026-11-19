import { dirname, extname } from 'path';
import { realpath } from 'fs/promises';
import { createRequire } from 'module';
import { getRoot, isInside } from './repository.mjs';
import { readJson } from './utils.mjs';

const require = createRequire(import.meta.url);

const CLI_ONLY_OPTIONS = [
	'config',
	'help',
	'unsafeConfig',
	'version',
];

function isPlainObject(value) {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

// A `null` replacement removes the pattern inherited from an extended config,
// so it is an error when there is nothing to remove.
function mergeReplaceText(base, override) {
	const patterns = new Map(Object.entries(isPlainObject(base) ? base : {}));
	for (const [pattern, replacement] of Object.entries(override)) {
		if (replacement !== null) {
			patterns.set(pattern, replacement);
		} else if (!patterns.delete(pattern)) {
			throw new TypeError(`\`replaceText\` sets \`${pattern}\` to \`null\`, but no extended config defines that pattern to remove`);
		}
	}
	return Object.fromEntries(patterns);
}

function mergeConfigs(base, override) {
	const merged = { ...base, ...override };
	if (isPlainObject(override.replaceText)) {
		merged.replaceText = mergeReplaceText(base.replaceText, override.replaceText);
	}
	return merged;
}

function assertNoCliOnly(config, source) {
	const found = CLI_ONLY_OPTIONS.filter((key) => key in config);
	if (found.length > 0) {
		throw new TypeError(`${source} sets ${found.map((key) => `\`${key}\``).join(', ')}, which only apply on the command line`);
	}
}

// `extends` takes a single specifier for now; resolving through a list keeps room for an array later.
function toSpecifiers(specifiers) {
	if (typeof specifiers !== 'string' || specifiers === '') {
		throw new TypeError('`extends` must be a non-empty string');
	}
	return [specifiers];
}

// Extended configs are as untrusted as in-repo config: they are only ever read as JSON
// (never `require`d), and must really live inside the repository, so that `extends`
// can't pull an arbitrary file from the machine into the options (and from there into a template).
async function loadExtended(specifier, context) {
	const {
		fromDir,
		root,
		chain,
	} = context;
	let path;
	try {
		path = require.resolve(specifier, { paths: [fromDir] });
	} catch (e) {
		throw new Error(`Extended config \`${specifier}\` could not be found from ${fromDir}`, { cause: e });
	}
	if (extname(path) !== '.json') {
		throw new TypeError(`Extended config \`${specifier}\` resolves to ${path}, which is not a JSON file`);
	}
	const real = await realpath(path);
	if (!isInside(root, real)) {
		throw new Error(`Extended config \`${specifier}\` resolves to ${real}, which is outside the repository`);
	}
	if (chain.includes(real)) {
		throw new Error(`Extended configs form a cycle: ${[...chain, real].join(' -> ')}`);
	}
	const config = await readJson(real);
	if (!isPlainObject(config)) {
		throw new TypeError(`Extended config ${real} must contain a JSON object`);
	}
	assertNoCliOnly(config, `Extended config ${real}`);
	const nested = {
		fromDir: dirname(path),
		root,
		chain: [...chain, real],
	};
	return applyExtends(config, nested); // eslint-disable-line no-use-before-define
}

async function applyExtends(config, context) {
	const { extends: specifiers, ...own } = config;
	const base = specifiers === undefined
		? {}
		: await toSpecifiers(specifiers).reduce(
			async (previous, specifier) => mergeConfigs(await previous, await loadExtended(specifier, context)),
			Promise.resolve({}),
		);
	return mergeConfigs(base, own);
}

async function resolveConfig(config, fromDir, sources) {
	if (config.extends === undefined) {
		return mergeConfigs({}, config);
	}
	for (const [source, name] of sources) {
		if (source) {
			assertNoCliOnly(source, name);
		}
	}
	const context = {
		fromDir,
		root: await getRoot(),
		chain: [],
	};
	return applyExtends(config, context);
}

export default resolveConfig;
