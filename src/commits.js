const cmd = require('./cmd')
const getLogFormat = require('./log-format')
const { COMMIT_SEPARATOR, MESSAGE_SEPARATOR, parseCommits, parseCommit } = require('./parse-commits')

const fetchCommits = async (diff, options = {}) => {
  const format = await getLogFormat()
  const log = await cmd(`git log ${diff} --shortstat --pretty=format:${format} ${options.appendGitLog}`)
  return parseCommits(log, options)
}

module.exports = {
  COMMIT_SEPARATOR,
  MESSAGE_SEPARATOR,
  fetchCommits,
  parseCommit
}
