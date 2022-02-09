const { Command } = require('commander')
const { version } = require('../package.json')
const { fetchRemote } = require('./remote')
const { fetchTags } = require('./tags')
const { parseReleases } = require('./releases')
const { compileTemplate } = require('./template')
const { parseLimit, readFile, readJson, writeFile, fileExists, updateLog, formatBytes } = require('./utils')

const DEFAULT_OPTIONS = {
  output: 'CHANGELOG.md',
  template: 'compact',
  remote: 'origin',
  commitLimit: 3,
  backfillLimit: 3,
  tagPrefix: '',
  sortCommits: 'relevance',
  appendGitLog: '',
  appendGitTag: '',
  config: '.auto-changelog'
}

const PACKAGE_FILE = 'package.json'
const PACKAGE_OPTIONS_KEY = 'auto-changelog'
const PREPEND_TOKEN = '<!-- auto-changelog-above -->'

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
    .option('--ignore-commit-pattern <regex>', 'pattern to ignore when parsing commits')
    .option('--tag-pattern <regex>', 'override regex pattern for version tags')
    .option('--tag-prefix <prefix>', 'prefix used in version tags')
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
    .version(version)
    .parse(argv)
    .opts()

  const pkg = await readJson(PACKAGE_FILE)
  const packageOptions = pkg ? pkg[PACKAGE_OPTIONS_KEY] : null
  const dotOptions = await readJson(commandOptions.config || DEFAULT_OPTIONS.config)
  const options = {
    ...DEFAULT_OPTIONS,
    ...dotOptions,
    ...packageOptions,
    ...commandOptions
  }
  const remote = await fetchRemote(options)
  const latestVersion = await getLatestVersion(options)
  return {
    ...options,
    ...remote,
    latestVersion
  }
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
