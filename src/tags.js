import semver from 'semver'
import { cmd } from './utils'

export async function fetchTags (options) {
  const tags = (await cmd('git tag --sort=committerdate'))
    .trim()
    .split('\n')
    .reverse()
    .filter(isValidTag(options))
    .sort(sortTags(options))
  if (options.startingVersion) {
    const limit = tags.indexOf(options.startingVersion) + 1
    return tags.slice(0, limit)
  }
  return tags
}

const isValidTag = ({ tagPattern, tagPrefix }) => tag => {
  if (tagPattern) {
    return new RegExp(tagPattern).test(tag)
  }
  return semver.valid(tag.replace(tagPrefix, ''))
}

const sortTags = ({ tagPrefix }) => (a, b) => {
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
