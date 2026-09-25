const semver = require('semver')
const { getGitVersion } = require('./utils')
const { COMMIT_SEPARATOR, MESSAGE_SEPARATOR } = require('./parse-commits')

const BODY_FORMAT = '%B'
const FALLBACK_BODY_FORMAT = '%s%n%n%b'

const DEPENDENCIES = { getGitVersion }

async function getLogFormat (overrides) {
  const { getGitVersion } = { ...DEPENDENCIES, ...overrides }
  const gitVersion = await getGitVersion()
  const bodyFormat = gitVersion && semver.gte(gitVersion, '1.7.2')
    ? BODY_FORMAT
    : FALLBACK_BODY_FORMAT
  return `${COMMIT_SEPARATOR}%H%n%ai%n%an%n%ae%n${bodyFormat}${MESSAGE_SEPARATOR}`
}

module.exports = getLogFormat
