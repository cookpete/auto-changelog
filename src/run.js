import { Command } from 'commander'
import { readJson, writeFile, pathExists } from 'fs-extra'
import semver from 'semver'

import { version } from '../package.json'
import { fetchOrigin } from './origin'
import { fetchCommits } from './commits'
import { parseReleases } from './releases'
import { compileTemplate } from './template'
import { parseLimit } from './utils'

const DEFAULT_OPTIONS = {
  output: 'CHANGELOG.md',
  template: 'compact',
  remote: 'origin',
  commitLimit: 3
}

const NPM_VERSION_TAG_PREFIX = 'v'
const PACKAGE_OPTIONS_KEY = 'auto-changelog'

function getOptions (argv, pkg) {
  const options = new Command()
    .option('-o, --output [file]', `output file, default: ${DEFAULT_OPTIONS.output}`)
    .option('-t, --template [template]', `specify template to use [compact, keepachangelog, json], default: ${DEFAULT_OPTIONS.template}`)
    .option('-r, --remote [remote]', `specify git remote to use for links, default: ${DEFAULT_OPTIONS.remote}`)
    .option('-p, --package', 'use version from package.json as latest release')
    .option('-v, --latest-version [version]', 'use specified version as latest release')
    .option('-u, --unreleased', 'include section for unreleased changes')
    .option('-l, --commit-limit [count]', `number of commits to display per release, default: ${DEFAULT_OPTIONS.commitLimit}`, parseLimit)
    .option('-i, --issue-url [url]', `override url for issues, use {id} for issue id`)
    .option('--issue-pattern [regex]', `override regex pattern for issues in commit messages`)
    .option('--starting-commit [hash]', `starting commit to use for changelog generation`)
    .version(version)
    .parse(argv)

  if (!pkg) {
    if (options.package) {
      throw new Error('package.json could not be found')
    }
    return {
      ...DEFAULT_OPTIONS,
      ...options
    }
  }
  return {
    ...DEFAULT_OPTIONS,
    ...pkg[PACKAGE_OPTIONS_KEY],
    ...options
  }
}

function getLatestVersion (options, pkg) {
  if (options.latestVersion) {
    if (!semver.valid(options.latestVersion)) {
      throw new Error('--latest-version must be a valid semver version')
    }
    return options.latestVersion
  }
  if (options.package) {
    return NPM_VERSION_TAG_PREFIX + pkg.version
  }
  return null
}

export default async function run (argv) {
  const pkg = await pathExists('package.json') && await readJson('package.json')
  const options = getOptions(argv, pkg)
  const origin = await fetchOrigin(options.remote)
  const commits = await fetchCommits(origin, options)
  const latestVersion = getLatestVersion(options, pkg)
  const releases = parseReleases(commits, origin, latestVersion, options)
  const log = await compileTemplate(options.template, { releases })
  await writeFile(options.output, log)
  return `${Buffer.byteLength(log, 'utf8')} bytes written to ${options.output}`
}
