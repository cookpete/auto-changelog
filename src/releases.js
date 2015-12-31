import semver from 'semver'

import { uniq } from './utils'
import { findFixes, findMerge } from './commits'

export function parseReleases (commits, packageVersion) {
  const initial = [ newRelease(packageVersion) ]
  return commits.reduce(commitReducer, initial).reverse()
}

function newRelease (tag, date = new Date().toISOString()) {
  const release = {
    commits: [],
    fixes: [],
    merges: []
  }
  if (tag) {
    release.tag = tag
    release.date = date
  }
  return release
}

function commitReducer (releases, commit) {
  if (commit.tag && semver.valid(commit.tag)) {
    releases[0].fixes = uniq(releases[0].fixes, 'issue') // Remove duplicate fixes
    releases.unshift(newRelease(commit.tag, commit.date))
  }

  const merge = findMerge(commit.message)
  const fixes = findFixes(commit.message)

  if (merge) {
    releases[0].merges.push(merge)
  } else if (fixes) {
    releases[0].fixes.push({ fixes, commit })
  } else if (filterCommit(commit)) {
    releases[0].commits.push(commit)
  }

  return releases
}

function filterCommit (commit) {
  return !semver.valid(commit.subject) // Filter out version commits
}
