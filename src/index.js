#! /usr/bin/env node

import { writeFile } from 'fs'

import { cmd } from './utils'
import { parseCommits, LOG_FORMAT } from './commits'
import { parseReleases } from './releases'
import Template from './templates/Base'

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

Promise.all([ getCommits(), getOrigin() ]).then(([ commits, origin ]) => {
  const releases = parseReleases(commits)
  const log = new Template(origin).render(releases)
  return new Promise((resolve, reject) => {
    writeFile('CHANGELOG.md', log, err => {
      if (err) reject(err)
      resolve(log)
    })
  })
}).then(
  () => process.exit(0),
  e => console.error(e.message)
)
