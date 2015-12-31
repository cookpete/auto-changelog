#! /usr/bin/env node

import { writeFile } from 'fs'
import commander from 'commander'

import { version } from '../package.json'
import { cmd } from './utils'
import { parseCommits, LOG_FORMAT } from './commits'
import { parseReleases } from './releases'
import Template from './templates/Base'

const DEFAULT_OUTPUT = 'CHANGELOG.md'

commander
  .option('-o, --output [file]', `output file (default: ${DEFAULT_OUTPUT})`, DEFAULT_OUTPUT)
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

function generateLog ([ commits, origin ]) {
  const releases = parseReleases(commits)
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

const promises = [ getCommits(), getOrigin() ]

Promise.all(promises).then(generateLog).then(success, error)
