import semver from 'semver'

import { niceDate } from './utils'

const MERGE_COMMIT_PATTERN = /^Merge (remote-tracking )?branch '.+'/

export function parseReleases (commits, origin, packageVersion, options) {
  let release = newRelease(packageVersion)
  const releases = []
  for (let commit of commits) {
    if (commit.tag && semver.valid(commit.tag)) {
      if (release.tag || options.unreleased) {
        releases.push({
          ...release,
          href: getCompareLink(commit.tag, release.tag || 'HEAD', origin),
          commits: release.commits.sort(sortCommits),
          major: commit.tag && release.tag && semver.diff(commit.tag, release.tag) === 'major'
        })
      }
      release = newRelease(commit.tag, commit.date)
    }
    if (commit.merge) {
      release.merges.push(commit.merge)
    } else if (commit.fixes) {
      release.fixes.push({
        fixes: commit.fixes,
        commit
      })
    } else if (filterCommit(commit, release, options.commitLimit)) {
      release.commits.push(commit)
    }
  }
  releases.push(release)
  return releases
}

function newRelease (tag = null, date = new Date().toISOString()) {
  const release = {
    commits: [],
    fixes: [],
    merges: [],
    tag,
    date,
    title: tag || 'Unreleased',
    niceDate: niceDate(date),
    isoDate: date.slice(0, 10)
  }
  return release
}

function filterCommit (commit, release, limit) {
  if (semver.valid(commit.subject)) {
    // Filter out version commits
    return false
  }
  if (MERGE_COMMIT_PATTERN.test(commit.subject)) {
    // Filter out merge commits
    return false
  }
  if (release.merges.findIndex(m => m.message === commit.subject) !== -1) {
    // Filter out commits with the same message as an existing merge
    return false
  }
  if (limit === false) {
    return true
  }
  return release.commits.length < limit
}

function getCompareLink (from, to, origin) {
  if (origin.hostname === 'bitbucket.org') {
    return `${origin.url}/compare/${to}%0D${from}`
  }
  return `${origin.url}/compare/${from}...${to}`
}

function sortCommits (a, b) {
  return (b.insertions + b.deletions) - (a.insertions + a.deletions)
}
