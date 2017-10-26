import commander from 'commander'
import { readJson, writeFile } from 'fs-extra'

import { version } from '../package.json'
import { fetchOrigin } from './origin'
import { fetchCommits } from './commits'
import { parseReleases } from './releases'
import { compileTemplate } from './template'

const DEFAULT_OUTPUT = 'CHANGELOG.md'
const DEFAULT_TEMPLATE = 'compact'
const DEFAULT_REMOTE = 'origin'
const NPM_VERSION_TAG_PREFIX = 'v'

commander
  .option('-o, --output [file]', `output file, default: ${DEFAULT_OUTPUT}`, DEFAULT_OUTPUT)
  .option('-t, --template [template]', `specify template to use [compact, keepachangelog, json], default: ${DEFAULT_TEMPLATE}`, DEFAULT_TEMPLATE)
  .option('-r, --remote [remote]', `specify git remote to use for links, default: ${DEFAULT_REMOTE}`, DEFAULT_REMOTE)
  .option('-p, --package', 'use version from package.json as latest release')
  .option('-u, --unreleased', 'include section for unreleased changes')
  .version(version)
  .parse(process.argv)

async function getPackageVersion () {
  const pkg = await readJson('package.json')
  return NPM_VERSION_TAG_PREFIX + pkg.version
}

export default async function run () {
  const pkg = await readJson('package.json')
  let options = { ...commander }
  if (pkg) {
    options = {
      ...options,
      ...pkg['auto-changelog']
    }
  } else if (commander.package) {
    throw Error('package.json could not be found')
  }
  const origin = await fetchOrigin(options.remote)
  const commits = await fetchCommits(origin)
  const packageVersion = options.package ? await getPackageVersion() : null
  const releases = parseReleases(commits, origin, packageVersion, options.unreleased)
  const log = await compileTemplate(options.template, { releases })
  await writeFile(options.output, log)
  console.log(`${Buffer.byteLength(log, 'utf8')} bytes written to ${options.output}`)
  process.exit(0)
}
