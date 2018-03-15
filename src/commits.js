import semver from 'semver'

import { cmd, isLink } from './utils'

const COMMIT_SEPARATOR = '__AUTO_CHANGELOG_COMMIT_SEPARATOR__'
const MESSAGE_SEPARATOR = '__AUTO_CHANGELOG_MESSAGE_SEPARATOR__'
const LOG_FORMAT = COMMIT_SEPARATOR + '%H%n%d%n%ai%n%an%n%ae%n%B' + MESSAGE_SEPARATOR
const MATCH_COMMIT = /(.*)\n(?:\s\((.*)\))?\n(.*)\n(.*)\n(.*)\n([\S\s]+)/
const MATCH_STATS = /(\d+) files? changed(?:, (\d+) insertions?...)?(?:, (\d+) deletions?...)?/

// https://help.github.com/articles/closing-issues-via-commit-messages
const DEFAULT_FIX_PATTERN = /(?:close[sd]?|fixe?[sd]?|resolve[sd]?)\s(?:#(\d+)|(https?:\/\/.+?\/(?:issues|pull|pull-requests|merge_requests)\/(\d+)))/gi

const MERGE_PATTERNS = [
  /Merge pull request #(\d+) from .+\n\n(.+)/, // Regular GitHub merge
  /^(.+) \(#(\d+)\)(?:$|\n\n)/, // Github squash merge
  /Merged in .+ \(pull request #(\d+)\)\n\n(.+)/, // BitBucket merge
  /Merge branch .+ into .+\n\n(.+)[\S\s]+See merge request [^!]*!(\d+)/ // GitLab merge
]

export async function fetchCommits (remote, options) {
  const log = await cmd(`git log --shortstat --pretty=format:${LOG_FORMAT}`)
  return parseCommits(log, remote, options)
}

function parseCommits (string, remote, options = {}) {
  const commits = string
    .split(COMMIT_SEPARATOR)
    .slice(1)
    .map(commit => parseCommit(commit, remote, options))
    .filter(commit => {
      if (options.ignoreCommitPattern) {
        return new RegExp(options.ignoreCommitPattern).test(commit.subject) === false
      }
      return true
    })

  if (options.startingCommit) {
    const index = commits.findIndex(c => c.hash.indexOf(options.startingCommit) === 0)
    if (index === -1) {
      throw new Error(`Starting commit ${options.startingCommit} was not found`)
    }
    return commits.slice(0, index + 1)
  }

  return commits
}

function parseCommit (commit, remote, options = {}) {
  const [, hash, refs, date, author, email, tail] = commit.match(MATCH_COMMIT)
  const [message, stats] = tail.split(MESSAGE_SEPARATOR)
  return {
    hash,
    shorthash: hash.slice(0, 7),
    author,
    email,
    date: new Date(date).toISOString(),
    tag: getTag(refs, options),
    subject: getSubject(message),
    message: message.trim(),
    fixes: getFixes(message, remote, options),
    merge: getMerge(message, remote),
    href: getCommitLink(hash, remote),
    ...getStats(stats.trim())
  }
}

function getTag (refs, options) {
  if (!refs) return null
  for (let ref of refs.split(', ')) {
    const prefix = `tag: ${options.tagPrefix}`
    if (ref.indexOf(prefix) === 0) {
      const version = ref.replace(prefix, '')
      if (semver.valid(version)) {
        return version
      }
    }
  }
  return null
}

function getSubject (message) {
  if (!message) {
    return '_No commit message_'
  }
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

function getFixes (message, remote, options = {}) {
  const pattern = getFixPattern(options)
  let fixes = []
  let match = pattern.exec(message)
  if (!match) return null
  while (match) {
    const id = getFixID(match)
    const href = getIssueLink(match, id, remote, options.issueUrl)
    fixes.push({ id, href })
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

function getMerge (message, remote, mergeUrl) {
  for (let pattern of MERGE_PATTERNS) {
    const match = message.match(pattern)
    if (match) {
      const id = /^\d+$/.test(match[1]) ? match[1] : match[2]
      const message = /^\d+$/.test(match[1]) ? match[2] : match[1]
      return {
        id,
        message,
        href: getMergeLink(id, remote, mergeUrl)
      }
    }
  }
  return null
}

function getCommitLink (hash, remote) {
  if (!remote) {
    return null
  }
  if (/bitbucket/.test(remote.hostname)) {
    return `${remote.url}/commits/${hash}`
  }
  return `${remote.url}/commit/${hash}`
}

function getIssueLink (match, id, remote, issueUrl) {
  if (!remote) {
    return null
  }
  if (isLink(match[2])) {
    return match[2]
  }
  if (issueUrl) {
    return issueUrl.replace('{id}', id)
  }
  return `${remote.url}/issues/${id}`
}

function getMergeLink (id, remote) {
  if (!remote) {
    return null
  }
  if (/bitbucket/.test(remote.hostname)) {
    return `${remote.url}/pull-requests/${id}`
  }
  if (/gitlab/.test(remote.hostname)) {
    return `${remote.url}/merge_requests/${id}`
  }
  return `${remote.url}/pull/${id}`
}
