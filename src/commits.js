const semver = require('semver')
const { cmd, isLink, encodeHTML, niceDate, replaceText, getGitVersion } = require('./utils')

const COMMIT_SEPARATOR = '__AUTO_CHANGELOG_COMMIT_SEPARATOR__'
const MESSAGE_SEPARATOR = '__AUTO_CHANGELOG_MESSAGE_SEPARATOR__'
const MATCH_COMMIT = /(.*)\n(.*)\n(.*)\n(.*)\n([\S\s]+)/
const MATCH_STATS = /(\d+) files? changed(?:, (\d+) insertions?...)?(?:, (\d+) deletions?...)?/
const BODY_FORMAT = '%B'
const FALLBACK_BODY_FORMAT = '%s%n%n%b'

// https://help.github.com/articles/closing-issues-via-commit-messages
const DEFAULT_FIX_PATTERN = /(?:close[sd]?|fixe?[sd]?|resolve[sd]?)\s(?:#(\d+)|(https?:\/\/.+?\/(?:issues|pull|pull-requests|merge_requests)\/(\d+)))/gi

const MERGE_PATTERNS = [
  /^Merge pull request #(\d+) from .+\n\n(.+)/, // Regular GitHub merge
  /^(.+) \(#(\d+)\)(?:$|\n\n)/, // Github squash merge
  /^Merged in .+ \(pull request #(\d+)\)\n\n(.+)/, // BitBucket merge
  /^Merge branch .+ into .+\n\n(.+)[\S\s]+See merge request [^!]*!(\d+)/ // GitLab merge
]

const fetchCommits = async (diff, options = {}) => {
  const format = await getLogFormat()
  const log = await cmd(`git log ${diff} --shortstat --pretty=format:${format} ${options.appendGitLog}`)
  return parseCommits(log, options)
}

const getLogFormat = async () => {
  const gitVersion = await getGitVersion()
  const bodyFormat = gitVersion && semver.gte(gitVersion, '1.7.2') ? BODY_FORMAT : FALLBACK_BODY_FORMAT
  return `${COMMIT_SEPARATOR}%H%n%ai%n%an%n%ae%n${bodyFormat}${MESSAGE_SEPARATOR}`
}

const parseCommits = (string, options = {}) => {
  return string
    .split(COMMIT_SEPARATOR)
    .slice(1)
    .map(commit => parseCommit(commit, options))
    .filter(commit => filterCommit(commit, options))
}

const parseCommit = (commit, options = {}) => {
  const [, hash, date, author, email, tail] = commit.match(MATCH_COMMIT)
  const [body, stats] = tail.split(MESSAGE_SEPARATOR)
  const message = encodeHTML(body)
  const parsed = {
    hash,
    shorthash: hash.slice(0, 7),
    author,
    email,
    date: new Date(date).toISOString(),
    niceDate: niceDate(date),
    subject: replaceText(getSubject(message), options),
    message: message.trim(),
    fixes: getFixes(message, author, options),
    href: options.getCommitLink(hash),
    breaking: !!options.breakingPattern && new RegExp(options.breakingPattern).test(message),
    ...getStats(stats)
  }
  return {
    ...parsed,
    merge: getMerge(parsed, message, options)
  }
}

const getSubject = (message) => {
  if (!message.trim()) {
    return '_No commit message_'
  }
  return message.match(/[^\n]+/)[0].trim()
}

const getStats = (stats) => {
  if (!stats.trim()) return {}
  const [, files, insertions, deletions] = stats.match(MATCH_STATS)
  return {
    files: parseInt(files || 0),
    insertions: parseInt(insertions || 0),
    deletions: parseInt(deletions || 0)
  }
}

const getFixes = (message, author, options = {}) => {
  const pattern = getFixPattern(options)
  const fixes = []
  let match = pattern.exec(message)
  if (!match) return null
  while (match) {
    const id = getFixID(match)
    const href = isLink(match[2]) ? match[2] : options.getIssueLink(id)
    fixes.push({ id, href, author })
    match = pattern.exec(message)
  }
  return fixes
}

const getFixID = (match) => {
  // Get the last non-falsey value in the match array
  for (let i = match.length; i >= 0; i--) {
    if (match[i]) {
      return match[i]
    }
  }
}

const getFixPattern = (options) => {
  if (options.issuePattern) {
    return new RegExp(options.issuePattern, 'g')
  }
  return DEFAULT_FIX_PATTERN
}

const getMergePatterns = (options) => {
  if (options.mergePattern) {
    return MERGE_PATTERNS.concat(new RegExp(options.mergePattern, 'g'))
  }
  return MERGE_PATTERNS
}

const getMerge = (commit, message, options = {}) => {
  const patterns = getMergePatterns(options)
  for (const pattern of patterns) {
    const match = pattern.exec(message)
    if (match) {
      const id = /^\d+$/.test(match[1]) ? match[1] : match[2]
      const message = /^\d+$/.test(match[1]) ? match[2] : match[1]
      return {
        id,
        message: replaceText(message, options),
        href: options.getMergeLink(id),
        author: commit.author,
        commit
      }
    }
  }
  return null
}

const filterCommit = (commit, { ignoreCommitPattern, commitPattern }) => {
  if (ignoreCommitPattern && new RegExp(ignoreCommitPattern).test(commit.subject)) {
    return false
  }
  if (commitPattern) {
    return new RegExp(commitPattern).test(commit.subject)
  }
  return true
}

module.exports = {
  COMMIT_SEPARATOR,
  MESSAGE_SEPARATOR,
  fetchCommits,
  parseCommit
}
