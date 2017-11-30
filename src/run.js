import commander from 'commander'
import { readJson, writeFile, pathExists } from 'fs-extra'

import { version } from '../package.json'
import { fetchOrigin } from './origin'
import { fetchCommits } from './commits'
import { parseReleases } from './releases'
import { compileTemplate } from './template'
import { parseLimit } from './utils'

const DEFAULT_OUTPUT = 'CHANGELOG.md'
const DEFAULT_TEMPLATE = 'compact'
const DEFAULT_REMOTE = 'origin'
const DEFAULT_COMMIT_LIMIT = 3
const NPM_VERSION_TAG_PREFIX = 'v'
const PACKAGE_OPTIONS_KEY = 'auto-changelog'

function getOptions (argv, pkg) {
  const options = commander
    .option('-o, --output [file]', `output file, default: ${DEFAULT_OUTPUT}`, DEFAULT_OUTPUT)
    .option('-t, --template [template]', `specify template to use [compact, keepachangelog, json], default: ${DEFAULT_TEMPLATE}`, DEFAULT_TEMPLATE)
    .option('-r, --remote [remote]', `specify git remote to use for links, default: ${DEFAULT_REMOTE}`, DEFAULT_REMOTE)
    .option('-p, --package', 'use version from package.json as latest release')
    .option('-u, --unreleased', 'include section for unreleased changes')
    .option('-l, --commit-limit [count]', `number of commits to display per release, default: ${DEFAULT_COMMIT_LIMIT}`, parseLimit, DEFAULT_COMMIT_LIMIT)
    .option('-i, --issue-url [url]', `override url for issues, use {id} for issue id`)
    .version(version)
    .parse(argv)

  if (!pkg) {
    if (options.package) {
      throw Error('package.json could not be found')
    }
    return options
  }
  return {
    ...options,
    ...pkg[PACKAGE_OPTIONS_KEY]
  }
}

export default async function run (argv) {
  const pkg = await pathExists('package.json') && await readJson('package.json')
  const options = getOptions(argv, pkg)
  const origin = await fetchOrigin(options.remote)
  const commits = await fetchCommits(origin, options)
  const packageVersion = options.package ? NPM_VERSION_TAG_PREFIX + pkg.version : null
  const releases = parseReleases(commits, origin, packageVersion, options)
  const log = await compileTemplate(options.template, { releases })
  await writeFile(options.output, log)
  return `${Buffer.byteLength(log, 'utf8')} bytes written to ${options.output}`
}
