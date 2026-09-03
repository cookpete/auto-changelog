const { dirname, isAbsolute, join } = require('path')
const { Command } = require('commander')
const importCwd = require('import-cwd')
const { version } = require('../package.json')
const { fetchRemote } = require('./remote')
const { fetchTags } = require('./tags')
const { parseReleases } = require('./releases')
const { compileTemplate } = require('./template')
const { parseLimit, readFile, readJson, writeFile, fileExists, updateLog, formatBytes, isURL } = require('./utils')

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
const PREPEND_TOKEN = '<!-- auto-changelog-above -->'

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
  const unsafe = []
  for (const key of CODE_LOADING_OPTIONS) {
    if (key in config) {
      unsafe.push(`"${key}" loads code`)
    }
  }
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
const isMonorepoPackage = async pkg => {
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

const getOptions = async argv => {
  const commandOptions = new Command()
    .option('-o, --output <file>', `output file, default: ${DEFAULT_OPTIONS.output}`)
    .option('-c, --config <file>', `config file location, default: ${DEFAULT_OPTIONS.config}`)
    .option('-t, --template <template>', `specify template to use [compact, keepachangelog, json], default: ${DEFAULT_OPTIONS.template}`)
    .option('-r, --remote <remote>', `specify git remote to use for links, default: ${DEFAULT_OPTIONS.remote}`)
    .option('-p, --package [file]', 'use version from file as latest release, default: package.json')
    .option('-v, --latest-version <version>', 'use specified version as latest release')
    .option('-u, --unreleased', 'include section for unreleased changes')
    .option('-l, --commit-limit <count>', `number of commits to display per release, default: ${DEFAULT_OPTIONS.commitLimit}`, parseLimit)
    .option('-b, --backfill-limit <count>', `number of commits to backfill empty releases with, default: ${DEFAULT_OPTIONS.backfillLimit}`, parseLimit)
    .option('--commit-url <url>', 'override url for commits, use {id} for commit id')
    .option('-i, --issue-url <url>', 'override url for issues, use {id} for issue id') // -i kept for back compatibility
    .option('--merge-url <url>', 'override url for merges, use {id} for merge id')
    .option('--compare-url <url>', 'override url for compares, use {from} and {to} for tags')
    .option('--issue-pattern <regex>', 'override regex pattern for issues in commit messages')
    .option('--breaking-pattern <regex>', 'regex pattern for breaking change commits')
    .option('--merge-pattern <regex>', 'add custom regex pattern for merge commits')
    .option('--commit-pattern <regex>', 'pattern to include when parsing commits')
    .option('--ignore-commit-pattern <regex>', 'pattern to ignore when parsing commits')
    .option('--tag-pattern <regex>', 'override regex pattern for version tags')
    .option('--tag-prefix <prefix>', 'prefix used in version tags')
    .option('--autodetect-monorepo-disabled', 'disable detecting a monorepo package and stripping its name-based tag prefix from release titles')
    // declared alongside the positive form, not instead of it: a lone `--no-` option would put
    // `true` in the parsed options on every run, overriding in-repo config that never asked for it.
    .option('--no-autodetect-monorepo-disabled', 'enable monorepo autodetection, overriding in-repo config')
    .option('--starting-version <tag>', 'specify earliest version to include in changelog')
    .option('--starting-date <yyyy-mm-dd>', 'specify earliest date to include in changelog')
    .option('--ending-version <tag>', 'specify latest version to include in changelog')
    .option('--sort-commits <property>', `sort commits by property [relevance, date, date-desc], default: ${DEFAULT_OPTIONS.sortCommits}`)
    .option('--release-summary', 'use tagged commit message body as release summary')
    .option('--unreleased-only', 'only output unreleased changes')
    .option('--hide-empty-releases', 'hide empty releases')
    .option('--hide-credit', 'hide auto-changelog credit')
    .option('--handlebars-setup <file>', 'handlebars setup file')
    .option('--append-git-log <string>', 'string to append to git log command')
    .option('--append-git-tag <string>', 'string to append to git tag command')
    .option('--prepend', 'prepend changelog to output file')
    .option('--stdout', 'output changelog to stdout')
    .option('--plugins [name...]', 'use plugins to augment commit/merge/release information')
    .option('--unsafe-config', 'trust in-repo config completely, honoring options that can load code, run git commands, or make network requests; do not use with untrusted repositories')
    .version(version)
    .parse(argv)
    .opts()

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
  if (!options.autodetectMonorepoDisabled && await isMonorepoPackage(pkg)) {
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
  const latestVersion = await getLatestVersion(options)
  return {
    ...options,
    ...remote,
    latestVersion,
    plugins: parsePlugins(options.plugins)
  }
}

const parsePlugins = plugins => {
  if (!Array.isArray(plugins)) {
    throw new Error('--plugins requires at least one plugin name')
  }
  return plugins.map(p => importCwd(`auto-changelog-${p}`))
}

const getLatestVersion = async options => {
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

const run = async argv => {
  const options = await getOptions(argv)
  const log = string => options.stdout ? null : updateLog(string)
  log('Fetching tags…')
  const tags = await fetchTags(options)
  log(`${tags.length} version tags found…`)
  const onParsed = ({ title }) => log(`Fetched ${title}…`)
  const releases = await parseReleases(tags, options, onParsed)
  const changelog = await compileTemplate(releases, options)
  await write(changelog, options, log)
}

const write = async (changelog, options, log) => {
  if (options.stdout) {
    process.stdout.write(changelog)
    return
  }
  const bytes = formatBytes(Buffer.byteLength(changelog, 'utf8'))
  const existing = await fileExists(options.output) && await readFile(options.output, 'utf8')
  if (existing) {
    const index = options.prepend ? 0 : existing.indexOf(PREPEND_TOKEN)
    if (index !== -1) {
      const prepended = `${changelog}\n${existing.slice(index)}`
      await writeFile(options.output, prepended)
      log(`${bytes} prepended to ${options.output}\n`)
      return
    }
  }
  await writeFile(options.output, changelog)
  log(`${bytes} written to ${options.output}\n`)
}

module.exports = {
  run
}
