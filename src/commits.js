import find from 'array.prototype.find'

find.shim()

const COMMIT_SEPARATOR = '__AUTO_CHANGELOG_COMMIT_SEPARATOR__'
const MESSAGE_SEPARATOR = '__AUTO_CHANGELOG_MESSAGE_SEPARATOR__'

export const LOG_FORMAT = COMMIT_SEPARATOR + '%H%n%D%n%aI%n%an%n%ae%n%B' + MESSAGE_SEPARATOR

const MATCH_COMMIT = /(.*)\n(.*)\n(.*)\n(.*)\n(.*)\n([\S\s]+)/
const MATCH_STATS = /(\d+) files? changed(?:, (\d+) insertions?...)?(?:, (\d+) deletions?...)?/
const TAG_PREFIX = 'tag: '

// https://help.github.com/articles/closing-issues-via-commit-messages
const MATCH_ISSUE_FIX = /(?:close(?:s|d)?|fix(?:es|ed)?|resolve(?:s|d)?)\s(#\d+|https?:\/\/github\.com\/[^\/]+\/[^\/]+\/issues\/\d+)/gi
const MATCH_PULL_MERGE = /Merge pull request (#\d+) from .+\n\n(.+)/

export function parseCommits (string) {
  return string.split(COMMIT_SEPARATOR).slice(1).map(commit => {
    const [, hash, refs, date, author, email, tail] = commit.match(MATCH_COMMIT)
    const [message, stats] = tail.split(MESSAGE_SEPARATOR)
    return {
      hash,
      tag: refs ? tagFromRefs(refs) : null,
      author,
      email,
      date,
      subject: getSubject(message),
      message: message.trim(),
      ...parseStats(stats.trim())
    }
  })
}

function tagFromRefs (refs) {
  const valid = refs.split(', ').find(ref => ref.indexOf(TAG_PREFIX) === 0)
  return valid ? valid.replace(TAG_PREFIX, '') : null
}

function parseStats (stats) {
  if (!stats) return {}
  const [, files, insertions, deletions] = stats.match(MATCH_STATS)
  return {
    files: parseInt(files || 0, 10),
    insertions: parseInt(insertions || 0, 10),
    deletions: parseInt(deletions || 0, 10)
  }
}

export function findFixes (message) {
  let fixes = []
  let match = MATCH_ISSUE_FIX.exec(message)
  if (!match) return null
  while (match) {
    fixes.push(match[1] || match[2])
    match = MATCH_ISSUE_FIX.exec(message)
  }
  return fixes
}

export function findMerge (message) {
  const match = message.match(MATCH_PULL_MERGE)
  if (match) {
    return {
      pr: match[1],
      message: match[2]
    }
  }
  return null
}

function getSubject (message) {
  return message.match(/[^\n]+/)[0]
}
