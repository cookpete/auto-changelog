const test = require('tape')
const remotes = require('./data/remotes')
const { generateCommits } = require('./utils/commits')
const { parseReleases } = require('../src/releases')

const commitsFrom = map => ({ fetchCommits: diff => Promise.resolve(map[diff]) })

test('parseReleases: parses releases', async t => {
  const map = {
    'v1.0.0..v2.0.0': generateCommits([
      'Merge pull request #4 from branch\n\nSixth commit',
      'Fifth commit\nFixes #3',
      'Fourth commit'
    ]),
    'v1.0.0': generateCommits([
      'Merge pull request #2 from branch\n\nThird commit',
      'Second commit\nFixes #1',
      'First commit'
    ])
  }
  const options = {
    commitLimit: 3,
    backfillLimit: 3,
    tagPrefix: '',
    latestVersion: null,
    ...remotes.github
  }
  const tags = [
    {
      tag: 'v2.0.0',
      date: '2000-01-01',
      diff: 'v1.0.0..v2.0.0',
      major: true,
      href: 'https://github.com/user/repo/compare/v1.0.0...v2.0.0'
    },
    {
      tag: 'v1.0.0',
      date: '2000-01-01',
      diff: 'v1.0.0',
      major: false,
      href: null
    }
  ]
  const releases = await parseReleases(tags, options, null, commitsFrom(map))
  t.ok(Array.isArray(releases))
  t.equal(releases[0].tag, 'v2.0.0')
  t.equal(releases[0].major, true)
  t.equal(releases[0].href, 'https://github.com/user/repo/compare/v1.0.0...v2.0.0')
  t.equal(releases[0].commits.length, 1)
  t.equal(releases[0].commits[0].subject, 'Fourth commit')
  t.equal(releases[1].tag, 'v1.0.0')
  t.equal(releases[1].major, false)
  t.equal(releases[1].href, null)
  t.equal(releases[1].commits.length, 1)
  t.equal(releases[1].commits[0].subject, 'First commit')
})

test('parseReleases: applies commitLimit', async t => {
  const map = {
    'v1.0.0': generateCommits(['Second commit', 'First commit\nFixes #1'])
  }
  const options = { commitLimit: 1 }
  const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }]
  const releases = await parseReleases(tags, options, null, commitsFrom(map))
  t.equal(releases[0].commits.length, 1)
  t.equal(releases[0].commits[0].subject, 'Second commit')
})

test('parseReleases: false commitLimit', async t => {
  const map = {
    'v1.0.0': generateCommits(['Fourth commit', 'Third commit', 'Second commit', 'First commit'])
  }
  const options = { commitLimit: false }
  const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }]
  const releases = await parseReleases(tags, options, null, commitsFrom(map))
  t.equal(releases[0].commits.length, 4)
})

test('parseReleases: applies backfillLimit', async t => {
  const map = {
    'v1.0.0': generateCommits(['Second commit', 'First commit'])
  }
  const options = { backfillLimit: 1 }
  const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }]
  const releases = await parseReleases(tags, options, null, commitsFrom(map))
  t.equal(releases[0].commits.length, 1)
  t.equal(releases[0].commits[0].subject, 'Second commit')
})

test('parseReleases: false backfillLimit', async t => {
  const map = {
    'v1.0.0': generateCommits(['Fourth commit', 'Third commit', 'Second commit', 'First commit'])
  }
  const options = { commitLimit: 3, backfillLimit: false }
  const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }]
  const releases = await parseReleases(tags, options, null, commitsFrom(map))
  t.equal(releases[0].commits.length, 4)
})

test('parseReleases: includes breaking commits', async t => {
  const map = {
    'v1.0.0': generateCommits([
      { message: 'Second commit' },
      { message: 'First commit', breaking: true }
    ])
  }
  const options = { commitLimit: 0, backfillLimit: 0 }
  const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }]
  const releases = await parseReleases(tags, options, null, commitsFrom(map))
  t.equal(releases[0].commits.length, 1)
  t.equal(releases[0].commits[0].subject, 'First commit')
})

test('parseReleases: passes fixes to the processFixes plugin hook', async t => {
  const map = {
    'v1.0.0': generateCommits([
      'Merge pull request #2 from branch\n\nSecond commit',
      'First commit\nFixes #1'
    ])
  }
  const received = {}
  const plugin = {
    processMerges: merges => { received.merges = merges },
    processFixes: fixes => { received.fixes = fixes }
  }
  const options = {
    commitLimit: 3,
    backfillLimit: 3,
    plugins: [plugin],
    ...remotes.github
  }
  const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }]
  await parseReleases(tags, options, null, commitsFrom(map))
  t.equal(received.fixes.length, 1)
  t.equal(received.fixes[0].fixes[0].id, '1')
  t.equal(received.merges.length, 1)
  t.equal(received.merges[0].id, '2')
})

test('parseReleases: sorts commits with no stats by relevance', async t => {
  const map = {
    'v1.0.0': generateCommits([
      { message: 'Empty commit' },
      { message: 'Big commit', insertions: 400, deletions: 0 },
      { message: 'Small commit', insertions: 1, deletions: 0 }
    ])
  }
  const options = { commitLimit: 2, backfillLimit: 2, ...remotes.github }
  const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }]
  const releases = await parseReleases(tags, options, null, commitsFrom(map))
  t.equal(releases[0].commits.length, 2)
  t.equal(releases[0].commits[0].subject, 'Big commit')
  t.equal(releases[0].commits[1].subject, 'Small commit')
})

test('parseReleases: hides empty releases', async t => {
  const map = {
    'v1.0.0': []
  }
  const options = { hideEmptyReleases: true }
  const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }]
  const releases = await parseReleases(tags, options, null, commitsFrom(map))
  t.equal(releases.length, 0)
})
