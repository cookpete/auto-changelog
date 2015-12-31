#! /usr/bin/env node

import { readFile, writeFile } from 'fs'
import commander from 'commander'

import { version } from '../package.json'
import { cmd } from './utils'
import { parseCommits, LOG_FORMAT } from './commits'
import { parseReleases } from './releases'
import Template from './templates/Base'

const DEFAULT_OUTPUT = 'CHANGELOG.md'
const NPM_VERSION_TAG_PREFIX = 'v'

commander
  .option('-o, --output [file]', `output file (default: ${DEFAULT_OUTPUT})`, DEFAULT_OUTPUT)
  .option('-p, --package', 'use version from package.json as latest release')
  .version(version)
  .parse(process.argv)

function getCommits () {
  return cmd('git', ['log', '--shortstat', '--pretty=format:' + LOG_FORMAT]).then(parseCommits)
}

function getOrigin () {
  return cmd('git', ['remote', 'show', 'origin']).then(origin => {
    const match = origin.match(/https:\/\/github.com\/[^\/]+\/[^\.]+/)
    if (!match) {
      throw new Error('Must have a git remote called origin')
    }
    return match[0]
  })
}

function getPackageVersion () {
  if (commander.package) {
    return new Promise((resolve, reject) => {
      readFile('package.json', 'utf-8', (err, file) => {
        if (err) reject(err)
        resolve(JSON.parse(file).version)
      })
    })
  }
  return Promise.resolve(null)
}

function generateLog ([ commits, origin, packageVersion ]) {
  const releases = parseReleases(commits, NPM_VERSION_TAG_PREFIX + packageVersion)
  const log = new Template(origin).render(releases)

  return new Promise((resolve, reject) => {
    writeFile(commander.output, log, err => {
      if (err) reject(err)
      resolve(log)
    })
  })
}

function success (log) {
  const bytes = Buffer.byteLength(log, 'utf8')
  console.log(bytes + ' bytes written to ' + commander.output)
  process.exit(0)
}

function error (error) {
  throw new Error(error)
}

const promises = [ getCommits(), getOrigin(), getPackageVersion() ]

Promise.all(promises).then(generateLog).then(success, error)
