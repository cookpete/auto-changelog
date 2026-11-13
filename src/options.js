'use strict';

const {
	dirname,
	isAbsolute,
	join,
	resolve,
} = require('path');
const { default: pargs } = require('pargs');
const importCwd = require('import-cwd');
const cmd = require('./cmd');
const { fetchRemote } = require('./remote');
const {
	readJson,
	fileExists,
	isURL,
} = require('./utils');

const DEFAULT_OPTIONS = {
	output: 'CHANGELOG.md',
	template: 'compact',
	remote: 'origin',
	commitLimit: 3,
	backfillLimit: 3,
	tagPrefix: '',
	autodetectMonorepoDisabled: false,
	sortCommits: 'relevance',
	appendGitLog: '',
	appendGitTag: '',
	config: '.auto-changelog',
	plugins: [],
};

const PACKAGE_FILE = 'package.json';
const PACKAGE_OPTIONS_KEY = 'auto-changelog';

const DEPENDENCIES = {
	fetchRemote,
	readJson,
	fileExists,
	importCwd,
};

// The in-repo config sources
// (`.auto-changelog` and the package.json `auto-changelog` key) are untrusted:
// auto-changelog is occasionally run over repository content the user does not control,
// such as CI checking out an untrusted pull-request head.
// If that config sets an option that could load code,
// inject git arguments, write outside the repo, or make a network request,
// auto-changelog refuses to run rather than silently ignoring it.
// Such options must be passed on the command line, or trusted explicitly with the
// `--unsafe-config` opt-in. See GHSA-xpvr-2hvx-m8q4.
const CODE_LOADING_OPTIONS = ['handlebarsSetup', 'plugins'];
const SAFE_REMOTE = /^[\w./-]+$/;
function hasTraversal(path) {
	return isAbsolute(path) || (/(^|[\\/])\.\.([\\/]|$)/).test(path);
}

// `--output` is the only argument that makes `git log`/`git tag` write to an arbitrary file:
// spawn runs without a shell, and the append lands after the git subcommand so a `-c <config>` override cannot be injected.
function hasOutputArg(value) {
	return value.split(/\s+/).some((token) => (/^--output(=|$)/).test(token));
}

function assertRepoConfigSafe(config) {
	const unsafe = CODE_LOADING_OPTIONS
		.filter((x) => x in config)
		.map((key) => `"${key}" loads code`);

	if (typeof config.template === 'string' && isURL(config.template)) {
		unsafe.push('"template" is a URL (makes a network request)');
	}
	if (typeof config.remote === 'string' && !SAFE_REMOTE.test(config.remote)) {
		unsafe.push('"remote" contains whitespace or unexpected characters (injects git arguments)');
	}
	if (typeof config.output === 'string' && hasTraversal(config.output)) {
		unsafe.push('"output" is absolute or escapes the repository (writes outside it)');
	}
	for (const key of ['appendGitLog', 'appendGitTag']) {
		if (typeof config[key] === 'string' && hasOutputArg(config[key])) {
			unsafe.push(`"${key}" contains --output (writes to an arbitrary file)`);
		}
	}
	if (unsafe.length > 0) {
		throw new Error(`Refusing to run: in-repo config (.auto-changelog or the package.json "auto-changelog" key) sets unsafe options: ${unsafe.join('; ')}. Pass them on the command line instead, or re-run with --unsafe-config if you fully trust this repository.`);
	}
}

// A package is part of a monorepo if it declares a `repository.directory`
// (i.e. it lives in a subdirectory of a larger repo), or if an ancestor
// package.json within the same git repository declares npm `workspaces`.
async function isMonorepoPackage(pkg, readJSON) {
	if (pkg && pkg.repository && pkg.repository.directory) {
		return true;
	}
	const toplevel = (await cmd('git rev-parse --show-toplevel')).trim();
	const root = toplevel ? resolve(toplevel) : null;
	let dir = process.cwd();
	let parent = dirname(dir);
	while (dir !== root && parent !== dir) {
		const ancestor = await readJSON(join(parent, PACKAGE_FILE));
		if (ancestor && ancestor.workspaces) {
			return true;
		}
		dir = parent;
		parent = dirname(dir);
	}
	return false;
}

const SORT_COMMITS_CHOICES = [
	'relevance',
	'date',
	'date-desc',
	'subject',
	'subject-desc',
];

function camelCase(string) {
	return string.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

function parsePlugins(plugins, importCWD) {
	if (!Array.isArray(plugins)) {
		throw new Error('--plugins requires at least one plugin name');
	}
	return plugins.map((p) => importCWD(`auto-changelog-${p}`));
}

async function getLatestVersion(options, exists, readJSON) {
	if (options.latestVersion) {
		return options.latestVersion;
	}
	if (typeof options.package === 'string') {
		throw new TypeError('`package` no longer takes a file path; use `packageFile` (`--package-file <file>`) instead');
	}
	const file = options.packageFile || (options.package ? PACKAGE_FILE : null);
	if (file) {
		if (await exists(file) === false) {
			throw new Error(`File ${file} does not exist`);
		}
		const { version } = await readJSON(file);
		return version;
	}
	return null;
}

async function getOptions(argv, overrides) {
	const {
		fetchRemote: fR,
		readJson: readJSON,
		fileExists: fE,
		importCwd: importCWD,
	} = { ...DEPENDENCIES, ...overrides };
	const { values, help } = await pargs(__filename, {
		options: {
			output: {
				type: 'string',
				placeholder: 'file',
				short: 'o',
				description: 'output file',
				defaultDescription: DEFAULT_OPTIONS.output,
			},
			config: {
				type: 'string',
				placeholder: 'file',
				short: 'c',
				description: 'config file location',
				defaultDescription: DEFAULT_OPTIONS.config,
			},
			template: {
				type: 'string',
				placeholder: 'template',
				short: 't',
				description: 'specify template to use [compact, keepachangelog, json]',
				defaultDescription: DEFAULT_OPTIONS.template,
			},
			remote: {
				type: 'string',
				placeholder: 'remote',
				short: 'r',
				description: 'specify git remote to use for links',
				defaultDescription: DEFAULT_OPTIONS.remote,
			},
			package: {
				type: 'boolean',
				short: 'p',
				description: `use version from ${PACKAGE_FILE} as latest release`,
			},
			'package-file': {
				type: 'string',
				placeholder: 'file',
				description: 'use version from the specified file as latest release',
			},
			'latest-version': {
				type: 'string',
				placeholder: 'version',
				description: 'use specified version as latest release',
			},
			unreleased: {
				group: 'Releases',
				type: 'boolean',
				short: 'u',
				description: 'include section for unreleased changes',
			},
			'commit-limit': {
				group: 'Commits',
				type: 'integer',
				negatable: true,
				placeholder: 'count',
				short: 'l',
				description: 'number of commits to display per release',
				defaultDescription: String(DEFAULT_OPTIONS.commitLimit),
			},
			'backfill-limit': {
				group: 'Commits',
				type: 'integer',
				negatable: true,
				placeholder: 'count',
				short: 'b',
				description: 'number of commits to backfill empty releases with',
				defaultDescription: String(DEFAULT_OPTIONS.backfillLimit),
			},
			'commit-url': {
				group: 'Links',
				type: 'string',
				placeholder: 'url',
				description: 'override url for commits, use {id} for commit id',
			},
			'issue-url': {
				group: 'Links',
				type: 'string',
				placeholder: 'url',
				description: 'override url for issues, use {id} for issue id',
			},
			'merge-url': {
				group: 'Links',
				type: 'string',
				placeholder: 'url',
				description: 'override url for merges, use {id} for merge id',
			},
			'compare-url': {
				group: 'Links',
				type: 'string',
				placeholder: 'url',
				description: 'override url for compares, use {from} and {to} for tags',
			},
			'issue-pattern': {
				group: 'Commits',
				type: 'string',
				placeholder: 'regex',
				description: 'override regex pattern for issues in commit messages',
			},
			'breaking-pattern': {
				group: 'Commits',
				type: 'string',
				placeholder: 'regex',
				description: 'regex pattern for breaking change commits',
			},
			'merge-pattern': {
				group: 'Commits',
				type: 'string',
				placeholder: 'regex',
				description: 'add custom regex pattern for merge commits',
			},
			'commit-pattern': {
				group: 'Commits',
				type: 'string',
				placeholder: 'regex',
				description: 'pattern to include when parsing commits',
			},
			'ignore-commit-pattern': {
				group: 'Commits',
				type: 'string',
				placeholder: 'regex',
				description: 'pattern to ignore when parsing commits',
			},
			'tag-pattern': {
				group: 'Releases',
				type: 'string',
				placeholder: 'regex',
				description: 'override regex pattern for version tags',
			},
			'tag-prefix': {
				group: 'Releases',
				type: 'string',
				placeholder: 'prefix',
				description: 'prefix used in version tags',
			},
			// `allowNegative` gives `--no-autodetect-monorepo-disabled` for free, and only puts a value in
			// `values` when one of the two spellings was actually passed - so in-repo config still wins by
			// default, which the two separate commander declarations existed to achieve.
			'autodetect-monorepo-disabled': {
				group: 'Releases',
				type: 'boolean',
				description: 'disable detecting a monorepo package and stripping its name-based tag prefix from release titles',
			},
			'starting-version': {
				group: 'Releases',
				type: 'string',
				placeholder: 'tag',
				description: 'specify earliest version to include in changelog',
			},
			'starting-date': {
				group: 'Releases',
				type: 'string',
				placeholder: 'yyyy-mm-dd',
				description: 'specify earliest release date to include in changelog (filters releases by tag date, not commits)',
			},
			'ending-version': {
				group: 'Releases',
				type: 'string',
				placeholder: 'tag',
				description: 'specify latest version to include in changelog',
			},
			'sort-commits': {
				group: 'Commits',
				type: 'enum',
				choices: SORT_COMMITS_CHOICES,
				placeholder: 'property',
				description: `sort commits by property [${SORT_COMMITS_CHOICES.join(', ')}]`,
				defaultDescription: DEFAULT_OPTIONS.sortCommits,
			},
			'release-summary': {
				group: 'Releases',
				type: 'boolean',
				description: 'use tagged commit message body as release summary',
			},
			'unreleased-only': {
				group: 'Releases',
				type: 'boolean',
				description: 'only output unreleased changes',
			},
			'hide-empty-releases': {
				group: 'Releases',
				type: 'boolean',
				description: 'hide empty releases',
			},
			'hide-credit': { type: 'boolean', description: 'hide auto-changelog credit' },
			'handlebars-setup': {
				type: 'string',
				placeholder: 'file',
				description: 'handlebars setup file',
			},
			'keep-indentation': { type: 'boolean', description: 'keep indentation from the template in the output' },
			'append-git-log': {
				group: 'Commits',
				type: 'string',
				placeholder: 'string',
				description: 'string to append to git log command',
			},
			'append-git-tag': {
				group: 'Releases',
				type: 'string',
				placeholder: 'string',
				description: 'string to append to git tag command',
			},
			prepend: { type: 'boolean', description: 'prepend changelog to output file' },
			stdout: { type: 'boolean', description: 'output changelog to stdout' },
			plugins: {
				type: 'string',
				placeholder: 'name',
				multiple: true,
				optionalValue: true,
				description: 'use plugins to augment commit/merge/release information',
			},
			'unsafe-config': { type: 'boolean', description: 'trust in-repo config completely, honoring options that can load code, run git commands, or make network requests; do not use with untrusted repositories' },
		},
		// the binary and the entrypoint, as `process.argv` carries them
		args: argv.slice(2),
	});
	if (await help({ exit: false })) {
		return null;
	}
	const commandOptions = Object.fromEntries(Object.entries(values).map(([key, value]) => [camelCase(key), value]));

	const pkg = await readJSON(PACKAGE_FILE);
	const packageOptions = pkg ? pkg[PACKAGE_OPTIONS_KEY] : null;
	const dotOptions = await readJSON(commandOptions.config || DEFAULT_OPTIONS.config);
	const repoOptions = { ...dotOptions, ...packageOptions };
	if (!commandOptions.unsafeConfig) {
		assertRepoConfigSafe(repoOptions);
	}
	const options = {
		...DEFAULT_OPTIONS,
		...repoOptions,
		...commandOptions,
	};
	if (!options.autodetectMonorepoDisabled && await isMonorepoPackage(pkg, readJSON)) {
		if (!options.tagPrefix && pkg && pkg.name) {
			// Monorepo version tags are conventionally prefixed with the package name
			// (e.g. `my-package@1.2.3`), so derive the prefix from package.json rather
			// than requiring it to be configured for every package.
			options.tagPrefix = `${pkg.name}@`;
		}
		// Strip the (derived or configured) prefix from release titles, while still
		// using the full tags for compare links.
		options.stripTagPrefix = true;
	}
	const remote = await fR(options);
	const latestVersion = await getLatestVersion(options, fE, readJSON);
	return {
		...options,
		...remote,
		latestVersion,
		plugins: parsePlugins(options.plugins, importCWD),
	};
}

module.exports = getOptions;
