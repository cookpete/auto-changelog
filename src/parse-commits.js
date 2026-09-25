const { isLink, encodeHTML, niceDate, replaceText } = require('./utils')

const COMMIT_SEPARATOR = '__AUTO_CHANGELOG_COMMIT_SEPARATOR__'
const MESSAGE_SEPARATOR = '__AUTO_CHANGELOG_MESSAGE_SEPARATOR__'
const MATCH_COMMIT = /(.*)\n(.*)\n(.*)\n(.*)\n([\S\s]+)/
const MATCH_STATS = /(\d+) files? changed(?:, (\d+) insertions?...)?(?:, (\d+) deletions?...)?/

// https://help.github.com/articles/closing-issues-via-commit-messages
const DEFAULT_FIX_PATTERN = /(?:close[sd]?|fixe?[sd]?|resolve[sd]?)\s(?:#(\d+)|(https?:\/\/.+?\/(?:issues|pull|pull-requests|merge_requests)\/(\d+)))/gi

const MERGE_PATTERNS = [
  /^Merge pull request #(\d+) from .+\n\n(.+)/, // Regular GitHub merge
  /^(.+) \(#(\d+)\)(?:$|\n\n)/, // Github squash merge
  /^Merged in .+ \(pull request #(\d+)\)\n\n(.+)/, // BitBucket merge
  /^Merge branch .+ into .+\n\n(.+)[\S\s]+See merge request [^!]*!(\d+)/ // GitLab merge
]

function parseCommits (string, options = {}) {
  return string
    .split(COMMIT_SEPARATOR)
    .slice(1)
    .map(commit => parseCommit(commit, options))
    .filter(commit => filterCommit(commit, options))
}

function parseCommit (commit, options = {}) {
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

function getSubject (message) {
  if (!message.trim()) {
    return '_No commit message_'
  }
  return message.match(/[^\n]+/)[0].trim()
}

function getStats (stats) {
  if (!stats.trim()) return {}
  const [, files, insertions, deletions] = stats.match(MATCH_STATS)
  return {
    files: parseInt(files || 0),
    insertions: parseInt(insertions || 0),
    deletions: parseInt(deletions || 0)
  }
}

function getFixes (message, author, options = {}) {
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

function getFixID (match) {
  // Get the last non-falsey value in the match array
  for (let i = match.length; i >= 0; i--) {
    if (match[i]) {
      return match[i]
    }
  }
}

function getFixPattern (options) {
  if (options.issuePattern) {
    return new RegExp(options.issuePattern, 'g')
  }
  return DEFAULT_FIX_PATTERN
}

function getMergePatterns (options) {
  if (options.mergePattern) {
    return MERGE_PATTERNS.concat(new RegExp(options.mergePattern, 'g'))
  }
  return MERGE_PATTERNS
}

function getMerge (commit, message, options = {}) {
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

function filterCommit (commit, { ignoreCommitPattern, commitPattern }) {
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
  parseCommits,
  parseCommit,
  getSubject,
  getFixes,
  getMerge
}
