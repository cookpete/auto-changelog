import { cmd, isLink } from './utils'

const COMMIT_SEPARATOR = '__AUTO_CHANGELOG_COMMIT_SEPARATOR__'
const MESSAGE_SEPARATOR = '__AUTO_CHANGELOG_MESSAGE_SEPARATOR__'
const LOG_FORMAT = COMMIT_SEPARATOR + '%H%n%D%n%aI%n%an%n%ae%n%B' + MESSAGE_SEPARATOR
const MATCH_COMMIT = /(.*)\n(.*)\n(.*)\n(.*)\n(.*)\n([\S\s]+)/
const MATCH_STATS = /(\d+) files? changed(?:, (\d+) insertions?...)?(?:, (\d+) deletions?...)?/
const TAG_PREFIX = 'tag: '

// https://help.github.com/articles/closing-issues-via-commit-messages
const FIX_PATTERN = /(?:close[sd]?|fixe?[sd]?|resolve[sd]?)\s(?:#(\d+)|(https?:\/\/.+\/issues\/(\d+)))/gi

const MERGE_PATTERNS = [
  /Merge pull request #(\d+) from .+\n\n(.+)/, // Regular GitHub merge
  /(.+) \(#(\d+)\)\n\n\*/, // Github squash merge
  /Merged in .+ \(pull request #(\d+)\)\n\n(.+)/, // BitBucket merge
  /Merge branch .+ into .+\n\n(.+)[\S\s]+See merge request !(\d+)/ // GitLab merge
]

export async function fetchCommits (origin) {
  const log = await cmd(`git log --shortstat --pretty=format:${LOG_FORMAT}`)
  return parseCommits(log, origin)
}

function parseCommits (string, origin) {
  return string
    .split(COMMIT_SEPARATOR)
    .slice(1)
    .map(commit => parseCommit(commit, origin))
}

function parseCommit (commit, origin) {
  const [, hash, refs, date, author, email, tail] = commit.match(MATCH_COMMIT)
  const [message, stats] = tail.split(MESSAGE_SEPARATOR)
  return {
    hash,
    shorthash: hash.slice(0, 7),
    author,
    email,
    date,
    tag: getTag(refs),
    subject: getSubject(message),
    message: message.trim(),
    fixes: getFixes(message, origin),
    merge: getMerge(message, origin),
    href: getCommitLink(hash, origin),
    ...getStats(stats.trim())
  }
}

function getTag (refs) {
  if (!refs) return null
  for (let ref of refs.split(', ')) {
    if (ref.indexOf(TAG_PREFIX) === 0) {
      return ref.replace(TAG_PREFIX, '')
    }
  }
  return null
}

function getSubject (message) {
  return message.match(/[^\n]+/)[0]
}

function getStats (stats) {
  if (!stats) return {}
  const [, files, insertions, deletions] = stats.match(MATCH_STATS)
  return {
    files: parseInt(files || 0),
    insertions: parseInt(insertions || 0),
    deletions: parseInt(deletions || 0)
  }
}

function getFixes (message, origin) {
  let fixes = []
  let match = FIX_PATTERN.exec(message)
  if (!match) return null
  while (match) {
    const id = isLink(match[2]) ? match[3] : match[1]
    const href = isLink(match[2]) ? match[2] : getIssueLink(match[1], origin)
    fixes.push({ id, href })
    match = FIX_PATTERN.exec(message)
  }
  return fixes
}

function getMerge (message, origin) {
  for (let pattern of MERGE_PATTERNS) {
    const match = message.match(pattern)
    if (match) {
      const id = /^\d+$/.test(match[1]) ? match[1] : match[2]
      const message = /^\d+$/.test(match[1]) ? match[2] : match[1]
      return {
        id,
        message,
        href: getPullLink(id, origin)
      }
    }
  }
  return null
}

function getCommitLink (hash, origin) {
  if (origin.hostname === 'bitbucket.org') {
    return `${origin.repoURL}/commits/${hash}`
  }
  return `${origin.repoURL}/commit/${hash}`
}

function getIssueLink (id, origin) {
  return `${origin.repoURL}/issues/${id}`
}

function getPullLink (id, origin) {
  if (origin.hostname === 'bitbucket.org') {
    return `${origin.repoURL}/pull-requests/${id}`
  }
  if (origin.hostname === 'gitlab.com') {
    return `${origin.repoURL}/merge_requests/${id}`
  }
  return `${origin.repoURL}/pulls/${id}`
}
