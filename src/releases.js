import semver from 'semver'
import { niceDate } from './utils'

const MERGE_COMMIT_PATTERN = /^Merge (remote-tracking )?branch '.+'/

export function parseReleases (commits, remote, latestVersion, options) {
  let release = newRelease(latestVersion)
  const releases = []
  for (let commit of commits) {
    if (commit.tag) {
      if (release.tag || options.unreleased) {
        releases.push({
          ...release,
          href: getCompareLink(
            `${options.tagPrefix}${commit.tag}`,
            release.tag ? `${options.tagPrefix}${release.tag}` : 'HEAD',
            remote
          ),
          commits: release.commits.sort(sortCommits),
          major: !options.disableSemver && commit.tag && release.tag && semver.diff(commit.tag, release.tag) === 'major'
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

export function sortReleasesBySemver (a, b) {
  if (a.tag && b.tag) return semver.rcompare(a.tag, b.tag)
  if (a.tag) return 1
  if (b.tag) return -1
  return 0
}

export function sortReleasesByStr (a, b) {
  if (a.tag && b.tag) return b.tag.localeCompare(a.tag)
  if (a.tag) return 1
  if (b.tag) return -1
  return 0
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
  if (commit.breaking) {
    return true
  }
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

function getCompareLink (from, to, remote) {
  if (!remote) {
    return null
  }
  if (/bitbucket/.test(remote.hostname)) {
    return `${remote.url}/compare/${to}..${from}`
  }
  return `${remote.url}/compare/${from}...${to}`
}

function sortCommits (a, b) {
  if (!a.breaking && b.breaking) return -1
  if (a.breaking && !b.breaking) return 1
  return (b.insertions + b.deletions) - (a.insertions + a.deletions)
}
