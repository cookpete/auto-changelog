import semver from 'semver'
import { niceDate } from './utils'

const MERGE_COMMIT_PATTERN = /^Merge (remote-tracking )?branch '.+'/
const COMMIT_MESSAGE_PATTERN = /\n+([\S\s]+)/

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
          commits: sliceCommits(release.commits.sort(sortCommits), options, release),
          major: !options.tagPattern && commit.tag && release.tag && semver.diff(commit.tag, release.tag) === 'major'
        })
      }
      const summary = getSummary(commit.message, options.releaseSummary)
      release = newRelease(commit.tag, commit.date, summary)
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
  releases.push({
    ...release,
    commits: sliceCommits(release.commits.sort(sortCommits), options, release)
  })
  return releases
}

export function sortReleases (a, b) {
  if (a.tag && b.tag) return semver.rcompare(a.tag, b.tag)
  if (a.tag) return 1
  if (b.tag) return -1
  return 0
}

function newRelease (tag = null, date = new Date().toISOString(), summary = null) {
  return {
    commits: [],
    fixes: [],
    merges: [],
    tag,
    date,
    summary,
    title: tag || 'Unreleased',
    niceDate: niceDate(date),
    isoDate: date.slice(0, 10)
  }
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
  return true
}

function getCompareLink (from, to, remote) {
  if (!remote) {
    return null
  }
  if (/bitbucket/.test(remote.hostname)) {
    return `${remote.url}/compare/${to}..${from}`
  }
  if (/dev\.azure/.test(remote.hostname) || /visualstudio/.test(remote.hostname)) {
    return `${remote.url}/branches?baseVersion=GT${to}&targetVersion=GT${from}&_a=commits`
  }
  return `${remote.url}/compare/${from}...${to}`
}

function getSummary (message, releaseSummary) {
  if (!message || !releaseSummary) {
    return null
  }
  if (COMMIT_MESSAGE_PATTERN.test(message)) {
    return message.match(COMMIT_MESSAGE_PATTERN)[1]
  }
  return null
}

function sortCommits (a, b) {
  if (!a.breaking && b.breaking) return -1
  if (a.breaking && !b.breaking) return 1
  return (b.insertions + b.deletions) - (a.insertions + a.deletions)
}

function sliceCommits (commits, options, release) {
  if (options.commitLimit === false) {
    return commits
  }
  const emptyRelease = release.fixes.length === 0 && release.merges.length === 0
  const limit = emptyRelease ? options.backfillLimit : options.commitLimit
  return commits.slice(0, limit)
}
