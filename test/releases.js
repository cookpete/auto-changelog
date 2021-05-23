const { describe, it, afterEach } = require('mocha')
const { expect } = require('chai')
const remotes = require('./data/remotes')
const { generateCommits } = require('./utils/commits')
const {
  parseReleases,
  __Rewire__: mock,
  __ResetDependency__: unmock
} = require('../src/releases')

describe('parseReleases', () => {
  afterEach(() => {
    unmock('fetchCommits')
  })

  it('parses releases', async () => {
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
    mock('fetchCommits', diff => Promise.resolve(map[diff]))
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
    const releases = await parseReleases(tags, options)
    expect(releases).to.be.an('array')
    expect(releases[0]).to.include({
      tag: 'v2.0.0',
      major: true,
      href: 'https://github.com/user/repo/compare/v1.0.0...v2.0.0'
    })
    expect(releases[0].commits).to.have.lengthOf(1)
    expect(releases[0].commits[0]).to.include({ subject: 'Fourth commit' })
    expect(releases[1]).to.include({
      tag: 'v1.0.0',
      major: false,
      href: null
    })
    expect(releases[1].commits).to.have.lengthOf(1)
    expect(releases[1].commits[0]).to.include({ subject: 'First commit' })
  })

  it('applies commitLimit', async () => {
    const map = {
      'v1.0.0': generateCommits(['Second commit', 'First commit\nFixes #1'])
    }
    mock('fetchCommits', diff => Promise.resolve(map[diff]))
    const options = { commitLimit: 1 }
    const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }]
    const releases = await parseReleases(tags, options)
    expect(releases[0].commits).to.have.lengthOf(1)
    expect(releases[0].commits[0]).to.include({ subject: 'Second commit' })
  })

  it('false commitLimit', async () => {
    const map = {
      'v1.0.0': generateCommits(['Fourth commit', 'Third commit', 'Second commit', 'First commit'])
    }
    mock('fetchCommits', diff => Promise.resolve(map[diff]))
    const options = { commitLimit: false }
    const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }]
    const releases = await parseReleases(tags, options)
    expect(releases[0].commits).to.have.lengthOf(4)
  })

  it('applies backfillLimit', async () => {
    const map = {
      'v1.0.0': generateCommits(['Second commit', 'First commit'])
    }
    mock('fetchCommits', diff => Promise.resolve(map[diff]))
    const options = { backfillLimit: 1 }
    const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }]
    const releases = await parseReleases(tags, options)
    expect(releases[0].commits).to.have.lengthOf(1)
    expect(releases[0].commits[0]).to.include({ subject: 'Second commit' })
  })

  it('includes breaking commits', async () => {
    const map = {
      'v1.0.0': generateCommits([
        { message: 'Second commit' },
        { message: 'First commit', breaking: true }
      ])
    }
    mock('fetchCommits', diff => Promise.resolve(map[diff]))
    const options = { commitLimit: 0, backfillLimit: 0 }
    const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }]
    const releases = await parseReleases(tags, options)
    expect(releases[0].commits).to.have.lengthOf(1)
    expect(releases[0].commits[0]).to.include({ subject: 'First commit' })
  })

  it('hides empty releases', async () => {
    const map = {
      'v1.0.0': []
    }
    mock('fetchCommits', diff => Promise.resolve(map[diff]))
    const options = { hideEmptyReleases: true }
    const tags = [{ tag: 'v1.0.0', date: '2000-01-01', diff: 'v1.0.0' }]
    const releases = await parseReleases(tags, options)
    expect(releases).to.have.lengthOf(0)
  })
})
