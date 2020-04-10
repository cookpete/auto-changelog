const { randomBytes } = require('crypto')
const { parseCommit, MESSAGE_SEPARATOR } = require('../../src/commits.js')
const { getRemote } = require('../../src/remote.js')

const DEFAULT_REMOTE = getRemote('https://github.com/user/repo')

function generateCommit (data, options = {}, remote = DEFAULT_REMOTE) {
  const {
    message,
    hash = randomBytes(20).toString('hex'),
    date = '2000-01-01 00:00:00 +0000',
    ...extra
  } = typeof data === 'string' ? { message: data } : data
  const author = 'Example Author'
  const email = 'email@example.com'
  const string = `${hash}\n${date}\n${author}\n${email}\n${message}\n${MESSAGE_SEPARATOR}\n`
  return {
    ...parseCommit(string, remote, options),
    ...extra
  }
}

function generateCommits (array, options, remote) {
  return array.map(data => generateCommit(data, options, remote))
}

module.exports = {
  generateCommit,
  generateCommits
}
