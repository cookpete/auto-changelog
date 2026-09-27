const { dirname, isAbsolute, join } = require('path')
const { default: pargs } = require('pargs')
const importCwd = require('import-cwd')
const { version } = require('../package.json')
const { fetchRemote } = require('./remote')
const { parseLimit, readJson, fileExists, isURL } = require('./utils')

const DEFAULT_OPTIONS = {
  output: 'CHANGELOG.md',
  template: 'compact',
  remote: 'origin',
  commitLimit: 3,
  backfillLimit: 3,
  tagPrefix: '',
  // TODO[major]: default to false so monorepo autodetection is on by default
  autodetectMonorepoDisabled: true,
  sortCommits: 'relevance',
  appendGitLog: '',
  appendGitTag: '',
  config: '.auto-changelog',
  plugins: []
}

const PACKAGE_FILE = 'package.json'
const PACKAGE_OPTIONS_KEY = 'auto-changelog'

const DEPENDENCIES = {
  fetchRemote,
  readJson,
  fileExists,
  importCwd
}

// The in-repo config sources
// (`.auto-changelog` and the package.json `auto-changelog` key) are untrusted:
// auto-changelog is occasionally run over repository content the user does not control,
// such as CI checking out an untrusted pull-request head.
// If that config sets an option that could load code,
// inject git arguments, write outside the repo, or make a network request,
// auto-changelog refuses to run rather than silently ignoring it.
// Such options must be passed on the command line, or trusted explicitly with the
// `--unsafe-config` opt-in. See GHSA-xpvr-2hvx-m8q4.
const CODE_LOADING_OPTIONS = ['handlebarsSetup', 'plugins']
const SAFE_REMOTE = /^[\w./-]+$/
const hasTraversal = path => isAbsolute(path) || /(^|[\\/])\.\.([\\/]|$)/.test(path)

// `--output` is the only argument that makes `git log`/`git tag` write to an arbitrary file:
// spawn runs without a shell, and the append lands after the git subcommand so a `-c <config>` override cannot be injected.
const hasOutputArg = value => value.split(/\s+/).some(token => /^--output(=|$)/.test(token))

function assertRepoConfigSafe (config) {
  const unsafe = CODE_LOADING_OPTIONS
    .filter(x => x in config)
    .map(key => `"${key}" loads code`)

  if (typeof config.template === 'string' && isURL(config.template)) {
    unsafe.push('"template" is a URL (makes a network request)')
  }
  if (typeof config.remote === 'string' && !SAFE_REMOTE.test(config.remote)) {
    unsafe.push('"remote" contains whitespace or unexpected characters (injects git arguments)')
  }
  if (typeof config.output === 'string' && hasTraversal(config.output)) {
    unsafe.push('"output" is absolute or escapes the repository (writes outside it)')
  }
  for (const key of ['appendGitLog', 'appendGitTag']) {
    if (typeof config[key] === 'string' && hasOutputArg(config[key])) {
      unsafe.push(`"${key}" contains --output (writes to an arbitrary file)`)
    }
  }
  if (unsafe.length > 0) {
    throw new Error(`Refusing to run: in-repo config (.auto-changelog or the package.json "auto-changelog" key) sets unsafe options: ${unsafe.join('; ')}. Pass them on the command line instead, or re-run with --unsafe-config if you fully trust this repository.`)
  }
}

// A package is part of a monorepo if it declares a `repository.directory`
// (i.e. it lives in a subdirectory of a larger repo), or if an ancestor
// package.json declares npm `workspaces`.
async function isMonorepoPackage (pkg, readJson) {
  if (pkg && pkg.repository && pkg.repository.directory) {
    return true
  }
  let dir = process.cwd()
  let parent = dirname(dir)
  while (parent !== dir) {
    const ancestor = await readJson(join(parent, PACKAGE_FILE))
    if (ancestor && ancestor.workspaces) {
      return true
    }
    dir = parent
    parent = dirname(dir)
  }
  return false
}

const LIMIT_OPTIONS = new Set(['commitLimit', 'backfillLimit'])

const camelCase = string => string.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())

async function getOptions (argv, overrides) {
  const { fetchRemote, readJson, fileExists, importCwd } = { ...DEPENDENCIES, ...overrides }
  const { values, help } = await pargs(__filename, {
    options: {
      output: { type: 'string', placeholder: 'file', short: 'o', description: `output file, default: ${DEFAULT_OPTIONS.output}` },
      config: { type: 'string', placeholder: 'file', short: 'c', description: `config file location, default: ${DEFAULT_OPTIONS.config}` },
      template: { type: 'string', placeholder: 'template', short: 't', description: `specify template to use [compact, keepachangelog, json], default: ${DEFAULT_OPTIONS.template}` },
      remote: { type: 'string', placeholder: 'remote', short: 'r', description: `specify git remote to use for links, default: ${DEFAULT_OPTIONS.remote}` },
      package: { type: 'string', placeholder: 'file', short: 'p', optionalValue: true, description: 'use version from file as latest release, default: package.json' },
      'latest-version': { type: 'string', placeholder: 'version', short: 'v', description: 'use specified version as latest release' },
      unreleased: { type: 'boolean', short: 'u', description: 'include section for unreleased changes' },
      'commit-limit': { type: 'string', placeholder: 'count', short: 'l', description: `number of commits to display per release, default: ${DEFAULT_OPTIONS.commitLimit}` },
      'backfill-limit': { type: 'string', placeholder: 'count', short: 'b', description: `number of commits to backfill empty releases with, default: ${DEFAULT_OPTIONS.backfillLimit}` },
      'commit-url': { type: 'string', placeholder: 'url', description: 'override url for commits, use {id} for commit id' },
      // -i kept for back compatibility
      'issue-url': { type: 'string', placeholder: 'url', short: 'i', description: 'override url for issues, use {id} for issue id' },
      'merge-url': { type: 'string', placeholder: 'url', description: 'override url for merges, use {id} for merge id' },
      'compare-url': { type: 'string', placeholder: 'url', description: 'override url for compares, use {from} and {to} for tags' },
      'issue-pattern': { type: 'string', placeholder: 'regex', description: 'override regex pattern for issues in commit messages' },
      'breaking-pattern': { type: 'string', placeholder: 'regex', description: 'regex pattern for breaking change commits' },
      'merge-pattern': { type: 'string', placeholder: 'regex', description: 'add custom regex pattern for merge commits' },
      'commit-pattern': { type: 'string', placeholder: 'regex', description: 'pattern to include when parsing commits' },
      'ignore-commit-pattern': { type: 'string', placeholder: 'regex', description: 'pattern to ignore when parsing commits' },
      'tag-pattern': { type: 'string', placeholder: 'regex', description: 'override regex pattern for version tags' },
      'tag-prefix': { type: 'string', placeholder: 'prefix', description: 'prefix used in version tags' },
      // `allowNegative` gives `--no-autodetect-monorepo-disabled` for free, and only puts a value in
      // `values` when one of the two spellings was actually passed - so in-repo config still wins by
      // default, which the two separate commander declarations existed to achieve.
      'autodetect-monorepo-disabled': { type: 'boolean', description: 'disable detecting a monorepo package and stripping its name-based tag prefix from release titles' },
      'starting-version': { type: 'string', placeholder: 'tag', description: 'specify earliest version to include in changelog' },
      'starting-date': { type: 'string', placeholder: 'yyyy-mm-dd', description: 'specify earliest date to include in changelog' },
      'ending-version': { type: 'string', placeholder: 'tag', description: 'specify latest version to include in changelog' },
      'sort-commits': { type: 'string', placeholder: 'property', description: `sort commits by property [relevance, date, date-desc], default: ${DEFAULT_OPTIONS.sortCommits}` },
      'release-summary': { type: 'boolean', description: 'use tagged commit message body as release summary' },
      'unreleased-only': { type: 'boolean', description: 'only output unreleased changes' },
      'hide-empty-releases': { type: 'boolean', description: 'hide empty releases' },
      'hide-credit': { type: 'boolean', description: 'hide auto-changelog credit' },
      'handlebars-setup': { type: 'string', placeholder: 'file', description: 'handlebars setup file' },
      'append-git-log': { type: 'string', placeholder: 'string', greedy: true, description: 'string to append to git log command' },
      'append-git-tag': { type: 'string', placeholder: 'string', greedy: true, description: 'string to append to git tag command' },
      prepend: { type: 'boolean', description: 'prepend changelog to output file' },
      stdout: { type: 'boolean', description: 'output changelog to stdout' },
      plugins: { type: 'string', placeholder: 'name', variadic: true, optionalValue: true, description: 'use plugins to augment commit/merge/release information' },
      'unsafe-config': { type: 'boolean', description: 'trust in-repo config completely, honoring options that can load code, run git commands, or make network requests; do not use with untrusted repositories' }
    },
    // the binary and the entrypoint, as `process.argv` carries them
    args: argv.slice(2),
    // `-h`/`-V` are what this CLI already shipped
    shorts: true,
    // commander printed the bare version, with no `v` prefix
    version
  })
  if (await help({ exit: false })) {
    return null
  }
  const commandOptions = Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      const name = camelCase(key)
      return [name, LIMIT_OPTIONS.has(name) ? parseLimit(value) : value]
    })
  )

  const pkg = await readJson(PACKAGE_FILE)
  const packageOptions = pkg ? pkg[PACKAGE_OPTIONS_KEY] : null
  const dotOptions = await readJson(commandOptions.config || DEFAULT_OPTIONS.config)
  const repoOptions = { ...dotOptions, ...packageOptions }
  if (!commandOptions.unsafeConfig) {
    assertRepoConfigSafe(repoOptions)
  }
  const options = {
    ...DEFAULT_OPTIONS,
    ...repoOptions,
    ...commandOptions
  }
  if (!options.autodetectMonorepoDisabled && await isMonorepoPackage(pkg, readJson)) {
    if (!options.tagPrefix && pkg && pkg.name) {
      // Monorepo version tags are conventionally prefixed with the package name
      // (e.g. `my-package@1.2.3`), so derive the prefix from package.json rather
      // than requiring it to be configured for every package.
      options.tagPrefix = `${pkg.name}@`
    }
    // Strip the (derived or configured) prefix from release titles, while still
    // using the full tags for compare links.
    options.stripTagPrefix = true
  }
  const remote = await fetchRemote(options)
  const latestVersion = await getLatestVersion(options, fileExists, readJson)
  return {
    ...options,
    ...remote,
    latestVersion,
    plugins: parsePlugins(options.plugins, importCwd)
  }
}

function parsePlugins (plugins, importCwd) {
  if (!Array.isArray(plugins)) {
    throw new Error('--plugins requires at least one plugin name')
  }
  return plugins.map(p => importCwd(`auto-changelog-${p}`))
}

async function getLatestVersion (options, fileExists, readJson) {
  if (options.latestVersion) {
    return options.latestVersion
  }
  if (options.package) {
    const file = options.package === true ? PACKAGE_FILE : options.package
    if (await fileExists(file) === false) {
      throw new Error(`File ${file} does not exist`)
    }
    const { version } = await readJson(file)
    return version
  }
  return null
}

module.exports = getOptions
