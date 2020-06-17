const semver = require('semver')
const { fetchCommits } = require('./commits')
const { niceDate } = require('./utils')

const MERGE_COMMIT_PATTERN = /^Merge (remote-tracking )?branch '.+'/
const COMMIT_MESSAGE_PATTERN = /\n+([\S\s]+)/

async function createRelease (tag, previousTag, date, diff, remote, options, onParsed) {
  const commits = await fetchCommits(diff, remote, options)
  const merges = commits.filter(commit => commit.merge).map(commit => commit.merge)
  const fixes = commits.filter(commit => commit.fixes).map(commit => ({ fixes: commit.fixes, commit }))
  const emptyRelease = merges.length === 0 && fixes.length === 0
  const { message } = commits[0] || { message: null }
  const breakingCount = commits.filter(c => c.breaking).length
  const filteredCommits = commits
    .filter(commit => filterCommit(commit, options, merges))
    .sort(commitSorter(options))
    .slice(0, getCommitLimit(options, emptyRelease, breakingCount))
  const release = {
    tag,
    title: tag || 'Unreleased',
    date,
    isoDate: date.slice(0, 10),
    niceDate: niceDate(date),
    commits: filteredCommits,
    merges,
    fixes,
    summary: getSummary(message, options),
    major: Boolean(!options.tagPattern && tag && previousTag && semver.diff(tag, previousTag) === 'major'),
    href: getCompareLink(previousTag, tag, remote, options)
  }
  if (onParsed) {
    onParsed(release)
  }
  return release
}

function parseReleases (tags, remote, latestVersion, options, onParsed) {
  const releases = tags.map(({ tag, date }, index, tags) => {
    if (tags[index - 1] && tags[index - 1].tag === options.startingVersion) {
      return null
    }
    const previousTag = tags[index + 1] ? tags[index + 1].tag : null
    const diff = previousTag ? `${previousTag}..${tag}` : tag
    return createRelease(tag, previousTag, date, diff, remote, options, onParsed)
  })
  if (latestVersion || options.unreleased || options.unreleasedOnly) {
    const tag = latestVersion || null
    const previousTag = tags[0] ? tags[0].tag : null
    const date = new Date().toISOString()
    const diff = `${previousTag}..`
    const unreleased = createRelease(tag, previousTag, date, diff, remote, options, onParsed)
    if (options.unreleasedOnly) {
      return Promise.all([unreleased])
    }
    releases.unshift(unreleased)
  }
  return Promise.all(releases.filter(release => release))
}

function getCommitLimit ({ commitLimit, backfillLimit }, emptyRelease, breakingCount) {
  if (commitLimit === false) {
    return undefined // Return all commits
  }
  const limit = emptyRelease ? backfillLimit : commitLimit
  return Math.max(breakingCount, limit)
}

function filterCommit (commit, { ignoreCommitPattern }, merges) {
  if (commit.fixes || commit.merge) {
    // Filter out commits that already appear in fix or merge lists
    return false
  }
  if (commit.breaking) {
    return true
  }
  if (ignoreCommitPattern && new RegExp(ignoreCommitPattern).test(commit.subject)) {
    return false
  }
  if (semver.valid(commit.subject)) {
    // Filter out version commits
    return false
  }
  if (MERGE_COMMIT_PATTERN.test(commit.subject)) {
    // Filter out merge commits
    return false
  }
  if (merges.findIndex(m => m.message === commit.subject) !== -1) {
    // Filter out commits with the same message as an existing merge
    return false
  }
  return true
}

function getSummary (message, { releaseSummary }) {
  if (!message || !releaseSummary) {
    return null
  }
  if (COMMIT_MESSAGE_PATTERN.test(message)) {
    return message.match(COMMIT_MESSAGE_PATTERN)[1]
  }
  return null
}

function commitSorter ({ sortCommits }) {
  return (a, b) => {
    if (!a.breaking && b.breaking) return 1
    if (a.breaking && !b.breaking) return -1
    if (sortCommits === 'date') return new Date(a.date) - new Date(b.date)
    if (sortCommits === 'date-desc') return new Date(b.date) - new Date(a.date)
    return (b.insertions + b.deletions) - (a.insertions + a.deletions)
  }
}

function getCompareLink (previousTag, tag, remote, { tagPrefix = '' }) {
  if (!previousTag) {
    return null
  }
  const from = `${tagPrefix}${previousTag}`
  const to = tag ? `${tagPrefix}${tag}` : 'HEAD'
  return remote.getCompareLink(from, to)
}

module.exports = {
  parseReleases
}
