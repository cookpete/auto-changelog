const test = require('tape')
const remotes = require('./data/remotes')
const { fetchTags } = require('../src/tags')

const options = {
  tagPrefix: '',
  ...remotes.github
}

const DEFAULT_TAGS = [
  'v0.1.0---2000-02-01',
  'v0.2.0---2000-03-01',
  'v0.2.1---2000-03-02',
  'v0.2.2---2000-03-03',
  'v0.3.0---2000-04-01',
  'v1.0.0---2001-01-01'
].join('\n')

const gitTags = tags => ({ cmd: () => Promise.resolve(tags) })

const defaultTags = gitTags(DEFAULT_TAGS)

test('fetchTags: fetches tags', async t => {
  t.deepEqual(await fetchTags(options, defaultTags), [{
    tag: 'v1.0.0',
    version: 'v1.0.0',
    title: 'v1.0.0',
    date: '2001-01-01',
    isoDate: '2001-01-01',
    niceDate: '1 January 2001',
    diff: 'v0.3.0..v1.0.0',
    href: 'https://github.com/user/repo/compare/v0.3.0...v1.0.0',
    major: true,
    minor: false
  },
  {
    tag: 'v0.3.0',
    version: 'v0.3.0',
    title: 'v0.3.0',
    date: '2000-04-01',
    isoDate: '2000-04-01',
    niceDate: '1 April 2000',
    diff: 'v0.2.2..v0.3.0',
    href: 'https://github.com/user/repo/compare/v0.2.2...v0.3.0',
    major: false,
    minor: true
  },
  {
    tag: 'v0.2.2',
    version: 'v0.2.2',
    title: 'v0.2.2',
    date: '2000-03-03',
    isoDate: '2000-03-03',
    niceDate: '3 March 2000',
    diff: 'v0.2.1..v0.2.2',
    href: 'https://github.com/user/repo/compare/v0.2.1...v0.2.2',
    major: false,
    minor: false
  },
  {
    tag: 'v0.2.1',
    version: 'v0.2.1',
    title: 'v0.2.1',
    date: '2000-03-02',
    isoDate: '2000-03-02',
    niceDate: '2 March 2000',
    diff: 'v0.2.0..v0.2.1',
    href: 'https://github.com/user/repo/compare/v0.2.0...v0.2.1',
    major: false,
    minor: false
  },
  {
    tag: 'v0.2.0',
    version: 'v0.2.0',
    title: 'v0.2.0',
    date: '2000-03-01',
    isoDate: '2000-03-01',
    niceDate: '1 March 2000',
    diff: 'v0.1.0..v0.2.0',
    href: 'https://github.com/user/repo/compare/v0.1.0...v0.2.0',
    major: false,
    minor: true
  },
  {
    tag: 'v0.1.0',
    version: 'v0.1.0',
    title: 'v0.1.0',
    date: '2000-02-01',
    isoDate: '2000-02-01',
    niceDate: '1 February 2000',
    diff: 'v0.1.0',
    href: null,
    major: false,
    minor: false
  }])
})

test('fetchTags: supports --starting-version', async t => {
  t.equal((await fetchTags({ ...options, startingVersion: 'v0.3' }, defaultTags)).length, 2)
  t.equal((await fetchTags({ ...options, startingVersion: 'v1' }, defaultTags)).length, 1) // Inferred semver
  t.equal((await fetchTags({ ...options, startingVersion: 'v0.2.8' }, defaultTags)).length, 2) // Non-existent tag from the past
  t.equal((await fetchTags({ ...options, startingVersion: 'v2.0.0' }, defaultTags)).length, 0) // Non-existent tag from the future
})

test('fetchTags: supports --starting-version older than every tag', async t => {
  t.equal((await fetchTags({ ...options, startingVersion: 'v0.0.1' }, defaultTags)).length, 6)
})

test('fetchTags: throws a useful error for an invalid --starting-version', async t => {
  try {
    await fetchTags({ ...options, startingVersion: 'not-a-version' }, defaultTags)
    t.fail('should throw')
  } catch (error) {
    t.match(error.message, /not a valid version/)
  }
})

test('fetchTags: supports --starting-version with non-semver tags', async t => {
  const tags = await fetchTags(
    { ...options, tagPattern: '^build-', startingVersion: 'v0.0.1' },
    gitTags(['build-9---2001-01-01', 'build-10---2002-01-01'].join('\n'))
  )
  t.equal(tags.length, 2)
})

test('fetchTags: supports --ending-version', async t => {
  t.equal((await fetchTags({ ...options, endingVersion: 'v0.2.2' }, defaultTags)).length, 4)
})

test('fetchTags: supports --starting-version and --ending-version', async t => {
  t.equal((await fetchTags({ ...options, startingVersion: 'v0.2.1', endingVersion: 'v0.2.2' }, defaultTags)).length, 2)
})

test('fetchTags: supports --starting-date', async t => {
  t.equal((await fetchTags({ ...options, startingDate: '2000-03-01' }, defaultTags)).length, 5)
  t.equal((await fetchTags({ ...options, startingDate: '2000-03-02' }, defaultTags)).length, 4)
  t.equal((await fetchTags({ ...options, startingDate: '2000-05-01' }, defaultTags)).length, 1)
})

test('fetchTags: sorts tags using semver', async t => {
  const tags = await fetchTags(options, gitTags([
    '0.1.0---2000-02-01',
    '0.2.0---2000-03-01',
    '0.3.0---2000-04-01',
    '0.2.1---2000-03-02',
    '0.2.2---2000-03-03',
    '1.0.0---2001-01-01'
  ].join('\n')))
  t.deepEqual(tags.map(t => t.title), [
    '1.0.0',
    '0.3.0',
    '0.2.2',
    '0.2.1',
    '0.2.0',
    '0.1.0'
  ])
})

test('fetchTags: does not sort when sorting via --append-git-tag', async t => {
  const tags = await fetchTags({ ...options, appendGitTag: '--sort=v:refname' }, gitTags([
    '0.1.0---2000-02-01',
    '0.2.0---2000-03-01',
    '0.3.0---2000-04-01',
    '0.2.1---2000-03-02',
    '0.2.2---2000-03-03',
    '1.0.0---2001-01-01'
  ].join('\n')))
  t.deepEqual(tags.map(t => t.title), [
    '0.1.0',
    '0.2.0',
    '0.3.0',
    '0.2.1',
    '0.2.2',
    '1.0.0'
  ])
})

test('fetchTags: supports partial semver tags', async t => {
  const tags = await fetchTags(options, gitTags([
    'v0.1---2000-02-01',
    'v0.2---2000-03-01',
    'v0.2.1---2000-03-02',
    'v0.2.2---2000-03-03',
    'v0.3---2000-04-01',
    'v1---2001-01-01'
  ].join('\n')))
  t.deepEqual(tags.map(t => t.version), [
    'v1.0.0',
    'v0.3.0',
    'v0.2.2',
    'v0.2.1',
    'v0.2.0',
    'v0.1.0'
  ])
})

test('fetchTags: supports --latest-version without v prefix', async t => {
  const tags = await fetchTags({ ...options, latestVersion: '2.0.0' }, gitTags([
    '0.1.0---2000-02-01',
    '0.2.0---2000-03-01',
    '0.2.1---2000-03-02',
    '0.2.2---2000-03-03',
    '0.3.0---2000-04-01',
    '1.0.0---2001-01-01'
  ].join('\n')))
  t.deepEqual(tags.map(t => t.title), [
    '2.0.0',
    '1.0.0',
    '0.3.0',
    '0.2.2',
    '0.2.1',
    '0.2.0',
    '0.1.0'
  ])
})

test('fetchTags: ignores invalid semver tags', async t => {
  const tags = await fetchTags(options, gitTags([
    'v0.1.0---2000-02-01',
    'invalid-semver-tag---2000-03-01',
    'v0.2.0---2000-03-02'
  ].join('\n')))
  t.deepEqual(tags.map(t => t.version), [
    'v0.2.0',
    'v0.1.0'
  ])
})

test('fetchTags: strips the tag prefix from titles when stripTagPrefix is set', async t => {
  const tags = await fetchTags({ ...options, tagPrefix: 'my-package@', stripTagPrefix: true }, gitTags([
    'my-package@0.1.0---2000-02-01',
    'my-package@1.0.0---2001-01-01'
  ].join('\n')))
  t.deepEqual(tags.map(t => t.title), ['1.0.0', '0.1.0'], 'titles drop the prefix')
  t.deepEqual(tags.map(t => t.version), ['1.0.0', '0.1.0'])
  t.deepEqual(tags.map(t => t.tag), ['my-package@1.0.0', 'my-package@0.1.0'], 'tags keep the prefix')
  t.equal(tags[0].href, 'https://github.com/user/repo/compare/my-package@0.1.0...my-package@1.0.0', 'compare link uses full tags')
})

test('fetchTags: keeps the tag prefix in titles by default', async t => {
  const tags = await fetchTags({ ...options, tagPrefix: 'my-package@' }, gitTags('my-package@1.0.0---2001-01-01'))
  t.equal(tags[0].title, 'my-package@1.0.0')
  t.equal(tags[0].version, '1.0.0')
})

test('fetchTags: targets the prefixed tag in the latest-version compare link when stripping', async t => {
  const tags = await fetchTags(
    { ...options, tagPrefix: 'my-package@', stripTagPrefix: true, latestVersion: '2.0.0' },
    gitTags('my-package@1.0.0---2001-01-01')
  )
  t.equal(tags[0].title, '2.0.0', 'latest title is the bare version')
  t.equal(tags[0].href, 'https://github.com/user/repo/compare/my-package@1.0.0...my-package@2.0.0', 'links to the prefixed tag')
})

test('fetchTags: keeps the v convention after the package prefix in the latest-version compare link', async t => {
  const tags = await fetchTags(
    { ...options, tagPrefix: 'my-package@', stripTagPrefix: true, latestVersion: '2.0.0' },
    gitTags('my-package@v1.0.0---2001-01-01')
  )
  t.equal(tags[0].title, 'v2.0.0', 'latest title keeps the v convention')
  t.equal(tags[0].href, 'https://github.com/user/repo/compare/my-package@v1.0.0...my-package@v2.0.0', 'links to the real prefixed v-tag')
})
