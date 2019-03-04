import semver from 'semver'
import { niceDate } from './utils'

const MERGE_COMMIT_PATTERN = /^Merge (remote-tracking )?branch '.+'/
const COMMIT_MESSAGE_PATTERN = /\n+([\S\s]+)/
const NUMERIC_PATTERN = /^\d+(\.\d+)?$/

export function parseReleases (commits, remote, latestVersion, options) {
  const sortCommits = options.sortCommitsByDate ? sortCommitsByDateDescending : sortCommitsByRelevance
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
  if (a.tag && b.tag) {
    if (semver.valid(a.tag) && semver.valid(b.tag)) {
      return semver.rcompare(a.tag, b.tag)
    }
    if (NUMERIC_PATTERN.test(a.tag) && NUMERIC_PATTERN.test(b.tag)) {
      return parseFloat(a.tag) < parseFloat(b.tag) ? 1 : -1
    }
    if (a.tag === b.tag) {
      return 0
    }
    return a.tag < b.tag ? 1 : -1
  }
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

function sortCommitsByRelevance (a, b) {
  if (!a.breaking && b.breaking) return 1
  if (a.breaking && !b.breaking) return -1
  return (b.insertions + b.deletions) - (a.insertions + a.deletions)
}

function sortCommitsByDateDescending (a, b) {
  return a.date < b.date ? 1 : -1
}

function sliceCommits (commits, options, release) {
  if (options.commitLimit === false) {
    return commits
  }
  const emptyRelease = release.fixes.length === 0 && release.merges.length === 0
  const limit = emptyRelease ? options.backfillLimit : options.commitLimit
  const minLimit = commits.filter(c => c.breaking).length
  return commits.slice(0, Math.max(minLimit, limit))
}
