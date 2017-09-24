#! /usr/bin/env node

import { readFile, writeFile } from 'fs'
import commander from 'commander'
import parseRepoURL from 'parse-github-url'

import { version } from '../package.json'
import { cmd } from './utils'
import { parseCommits, LOG_FORMAT } from './commits'
import { parseReleases } from './releases'
import templates from './templates'

const DEFAULT_OUTPUT = 'CHANGELOG.md'
const DEFAULT_TEMPLATE = 'default'
const NPM_VERSION_TAG_PREFIX = 'v'

commander
  .option('-o, --output [file]', `output file, default: ${DEFAULT_OUTPUT}`, DEFAULT_OUTPUT)
  .option('-p, --package', 'use version from package.json as latest release')
  .option('-t, --template [template]', `specify template to use for output, templates: ${Object.keys(templates).join(', ')}`, DEFAULT_TEMPLATE)
  .version(version)
  .parse(process.argv)

async function getCommits () {
  const log = await cmd(`git log --shortstat --pretty=format:${LOG_FORMAT}`)
  return parseCommits(log)
}

async function getOrigin () {
  const origin = await cmd('git config --get remote.origin.url')
  if (!origin) {
    throw new Error('Must have a git remote called origin')
  }
  return parseRepoURL(origin)
}

function getPackageVersion () {
  if (commander.package) {
    return new Promise((resolve, reject) => {
      readFile('package.json', 'utf-8', (err, file) => {
        if (err) reject(err)
        resolve(NPM_VERSION_TAG_PREFIX + JSON.parse(file).version)
      })
    })
  }
  return Promise.resolve(null)
}

function writeLog (log) {
  writeFile(commander.output, log, err => {
    if (err) throw err
    const bytes = Buffer.byteLength(log, 'utf8')
    console.log(`${bytes} bytes written to ${commander.output}`)
    process.exit(0)
  })
}

async function generateLog () {
  try {
    const Template = templates[commander.template]
    if (!Template) {
      throw new Error(`Template '${commander.template}' was not found`)
    }
    const [ commits, origin, packageVersion ] = [
      await getCommits(),
      await getOrigin(),
      await getPackageVersion()
    ]
    const releases = parseReleases(commits, packageVersion)
    const log = new Template(origin).render(releases)
    writeLog(log)
  } catch (e) {
    console.error(e)
  }
}

generateLog()
