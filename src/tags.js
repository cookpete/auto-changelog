const semver = require('semver')
const { cmd, niceDate } = require('./utils')

const DIVIDER = '---'
const MATCH_V = /^v\d/

const fetchTags = async (options, remote) => {
  const format = `%(refname:short)${DIVIDER}%(creatordate:short)`
  const tags = (await cmd(`git tag -l --sort=-creatordate --format=${format}`))
    .trim()
    .split('\n')
    .map(parseTag(options))
    .filter(isValidTag(options))
    .sort(sortTags(options))

  const { latestVersion, unreleased, unreleasedOnly, getCompareLink } = options
  if (latestVersion || unreleased || unreleasedOnly) {
    const v = !MATCH_V.test(latestVersion) && tags.some(({ version }) => MATCH_V.test(version)) ? 'v' : ''
    const previous = tags[0]
    const compareTo = latestVersion ? `${v}${latestVersion}` : 'HEAD'
    tags.unshift({
      tag: null,
      title: latestVersion ? `${v}${latestVersion}` : 'Unreleased',
      date: new Date().toISOString(),
      diff: previous ? `${previous.tag}..` : '',
      href: previous ? getCompareLink(previous.tag, compareTo) : null
    })
  }

  return tags
    .map(enrichTag(options))
    .slice(0, getLimit(tags, options))
}

const getLimit = (tags, { unreleasedOnly, startingVersion }) => {
  if (unreleasedOnly) {
    return 1
  }
  if (startingVersion) {
    const index = tags.findIndex(({ tag }) => tag === startingVersion)
    if (index !== -1) {
      return index + 1
    }
  }
  return tags.length
}

const parseTag = ({ tagPrefix }) => string => {
  const [tag, date] = string.split(DIVIDER)
  return {
    tag,
    date,
    title: tag,
    version: inferSemver(tag.replace(tagPrefix, ''))
  }
}

const enrichTag = ({ getCompareLink, tagPattern }) => (t, index, tags) => {
  const previous = tags[index + 1]
  return {
    isoDate: t.date.slice(0, 10),
    niceDate: niceDate(t.date),
    diff: previous ? `${previous.tag}..${t.tag}` : t.tag,
    href: previous ? getCompareLink(previous.tag, t.tag || 'HEAD') : null,
    major: Boolean(
      previous &&
      semver.valid(t.version) &&
      semver.valid(previous.version) &&
      semver.diff(t.version, previous.version) === 'major'
    ),
    ...t
  }
}

const isValidTag = ({ tagPattern }) => ({ tag, version }) => {
  if (tagPattern) {
    return new RegExp(tagPattern).test(tag)
  }
  return semver.valid(version)
}

const sortTags = ({ tagPrefix }) => ({ version: a }, { version: b }) => {
  if (semver.valid(a) && semver.valid(b)) {
    return semver.rcompare(a, b)
  }
  return a < b ? 1 : -1
}

const inferSemver = tag => {
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
