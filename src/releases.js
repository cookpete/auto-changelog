import semver from 'semver'

import { niceDate } from './utils'

export function parseReleases (commits, origin, packageVersion, includeUnreleased) {
  let release = newRelease(packageVersion)
  const releases = []
  for (let commit of commits) {
    if (commit.tag && semver.valid(commit.tag)) {
      if (release.tag || includeUnreleased) {
        releases.push({
          ...release,
          href: getCompareLink(commit.tag, release.tag || 'HEAD', origin),
          commits: release.commits.sort(sortCommits)
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
    } else if (filterCommit(commit)) {
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

function filterCommit (commit) {
  return !semver.valid(commit.subject) // Filter out version commits
}

function getCompareLink (from, to, origin) {
  if (origin.hostname === 'bitbucket.org') {
    return `${origin.repoURL}/compare/${to}%0D${from}`
  }
  return `${origin.repoURL}/compare/${from}...${to}`
}

function sortCommits (a, b) {
  return (b.insertions + b.deletions) - (a.insertions + a.deletions)
}
