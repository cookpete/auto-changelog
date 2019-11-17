import { Command } from 'commander'
import semver from 'semver'
import { version } from '../package.json'
import { fetchRemote } from './remote'
import { fetchTags } from './tags'
import { parseReleases } from './releases'
import { compileTemplate } from './template'
import { parseLimit, readJson, writeFile, fileExists, updateLog, formatBytes } from './utils'

const DEFAULT_OPTIONS = {
  output: 'CHANGELOG.md',
  template: 'compact',
  remote: 'origin',
  commitLimit: 3,
  backfillLimit: 3,
  tagPrefix: '',
  sortCommits: 'relevance',
  appendGitLog: '',
  config: '.auto-changelog'
}

const PACKAGE_FILE = 'package.json'
const PACKAGE_OPTIONS_KEY = 'auto-changelog'

async function getOptions (argv) {
  const options = new Command()
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
    .option('--tag-pattern <regex>', 'override regex pattern for release tags')
    .option('--tag-prefix <prefix>', 'prefix used in version tags')
    .option('--sort-commits <property>', `sort commits by property [relevance, date, date-desc], default: ${DEFAULT_OPTIONS.sortCommits}`)
    .option('--release-summary', 'use tagged commit message body as release summary')
    .option('--handlebars-setup <file>', 'handlebars setup file')
    .option('--append-git-log <string>', 'string to append to git log command')
    .option('--stdout', 'output changelog to stdout')
    .version(version)
    .parse(argv)

  const pkg = await readJson(PACKAGE_FILE)
  const packageOptions = pkg ? pkg[PACKAGE_OPTIONS_KEY] : null
  const dotOptions = await readJson(options.config || DEFAULT_OPTIONS.config)

  return {
    ...DEFAULT_OPTIONS,
    ...dotOptions,
    ...packageOptions,
    ...options
  }
}

async function getLatestVersion (options, tags) {
  if (options.latestVersion) {
    if (!semver.valid(options.latestVersion)) {
      throw new Error('--latest-version must be a valid semver version')
    }
    return options.latestVersion
  }
  if (options.package) {
    const file = options.package === true ? PACKAGE_FILE : options.package
    if (await fileExists(file) === false) {
      throw new Error(`File ${file} does not exist`)
    }
    const { version } = await readJson(file)
    const prefix = tags.some(tag => /^v/.test(tag)) ? 'v' : ''
    return `${prefix}${version}`
  }
  return null
}

export default async function run (argv) {
  const options = await getOptions(argv)
  const log = string => options.stdout ? null : updateLog(string)
  log('Fetching remote…')
  const remote = await fetchRemote(options)
  // const commitProgress = bytes => log(`Fetching commits… ${formatBytes(bytes)} loaded`)
  // const commits = await fetchCommits(remote, options, null, commitProgress)
  log('Generating changelog…')
  const tags = await fetchTags(options)
  const latestVersion = await getLatestVersion(options, tags)
  const releases = await parseReleases(tags, remote, latestVersion, options)
  const changelog = await compileTemplate(options, { releases })
  if (options.stdout) {
    process.stdout.write(changelog)
  } else {
    await writeFile(options.output, changelog)
  }
  const bytes = Buffer.byteLength(changelog, 'utf8')
  log(`${formatBytes(bytes)} written to ${options.output}\n`)
}
