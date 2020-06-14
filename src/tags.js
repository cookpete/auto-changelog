const semver = require('semver')
const { cmd } = require('./utils')

const DIVIDER = '---'

async function fetchTags (options) {
  const tags = (await cmd(`git tag -l --sort=-creatordate --format=%(refname:short)${DIVIDER}%(creatordate:short)`))
    .trim()
    .split('\n')
    .map(parseTag)
    .filter(isValidTag(options))
    .sort(sortTags(options))
  if (options.startingVersion) {
    const index = tags.findIndex(({ tag }) => tag === options.startingVersion)
    if (index !== -1) {
      // Leave the tag after the starting version for the diff
      return tags.slice(0, index + 2)
    }
  }
  return tags
}

const parseTag = string => {
  const [tag, date] = string.split(DIVIDER)
  return { tag, date }
}

const isValidTag = ({ tagPattern, tagPrefix }) => ({ tag }) => {
  if (tagPattern) {
    return new RegExp(tagPattern).test(tag)
  }
  return semver.valid(tag.replace(tagPrefix, ''))
}

const sortTags = ({ tagPrefix }) => ({ tag: a }, { tag: b }) => {
  const versions = {
    a: inferSemver(a.replace(tagPrefix, '')),
    b: inferSemver(b.replace(tagPrefix, ''))
  }
  if (semver.valid(versions.a) && semver.valid(versions.b)) {
    return semver.rcompare(versions.a, versions.b)
  }
  return a === b ? 0 : (a < b ? 1 : -1)
}

function inferSemver (tag) {
  if (/^v?\d+$/.test(tag)) {
    // v1 becomes v1.0.0
    return `${tag}.0.0`
  }
  if (/^v?\d+\.\d+$/.test(tag)) {
    // v1.0 becomes v1.0.0
    return `${tag}.0`
  }
  return tag
}

module.exports = {
  fetchTags
}
