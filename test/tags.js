const { describe, it, beforeEach, afterEach } = require('mocha')
const { expect } = require('chai')
const remotes = require('./data/remotes')
const {
  fetchTags,
  __Rewire__: mock,
  __ResetDependency__: unmock
} = require('../src/tags')

const options = {
  tagPrefix: '',
  ...remotes.github
}

describe('fetchTags', () => {
  beforeEach(() => {
    mock('cmd', () => Promise.resolve([
      'v0.1.0---2000-02-01',
      'v0.2.0---2000-03-01',
      'v0.2.1---2000-03-02',
      'v0.2.2---2000-03-03',
      'v0.3.0---2000-04-01',
      'v1.0.0---2001-01-01'
    ].join('\n')))
  })

  afterEach(() => {
    unmock('cmd')
  })

  it('fetches tags', async () => {
    expect(await fetchTags(options)).to.deep.equal([{
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

  it('supports --starting-version', async () => {
    expect(await fetchTags({ ...options, startingVersion: 'v0.3' })).to.have.lengthOf(2)
    expect(await fetchTags({ ...options, startingVersion: 'v1' })).to.have.lengthOf(1) // Inferred semver
    expect(await fetchTags({ ...options, startingVersion: 'v0.2.8' })).to.have.lengthOf(2) // Non-existent tag from the past
    expect(await fetchTags({ ...options, startingVersion: 'v2.0.0' })).to.have.lengthOf(0) // Non-existent tag from the future
  })

  it('supports --ending-version', async () => {
    expect(await fetchTags({ ...options, endingVersion: 'v0.2.2' })).to.have.lengthOf(4)
  })

  it('supports --starting-version and --ending-version', async () => {
    expect(await fetchTags({ ...options, startingVersion: 'v0.2.1', endingVersion: 'v0.2.2' })).to.have.lengthOf(2)
  })

  it('supports --starting-date', async () => {
    expect(await fetchTags({ ...options, startingDate: '2000-03-01' })).to.have.lengthOf(5)
    expect(await fetchTags({ ...options, startingDate: '2000-03-02' })).to.have.lengthOf(4)
    expect(await fetchTags({ ...options, startingDate: '2000-05-01' })).to.have.lengthOf(1)
  })

  it('sorts tags using semver', async () => {
    mock('cmd', () => Promise.resolve([
      '0.1.0---2000-02-01',
      '0.2.0---2000-03-01',
      '0.3.0---2000-04-01',
      '0.2.1---2000-03-02',
      '0.2.2---2000-03-03',
      '1.0.0---2001-01-01'
    ].join('\n')))
    const tags = await fetchTags(options)
    expect(tags.map(t => t.title)).to.deep.equal([
      '1.0.0',
      '0.3.0',
      '0.2.2',
      '0.2.1',
      '0.2.0',
      '0.1.0'
    ])
  })

  it('does not sort when sorting via --append-git-tag', async () => {
    mock('cmd', () => Promise.resolve([
      '0.1.0---2000-02-01',
      '0.2.0---2000-03-01',
      '0.3.0---2000-04-01',
      '0.2.1---2000-03-02',
      '0.2.2---2000-03-03',
      '1.0.0---2001-01-01'
    ].join('\n')))
    const tags = await fetchTags({ ...options, appendGitTag: '--sort=v:refname' })
    expect(tags.map(t => t.title)).to.deep.equal([
      '0.1.0',
      '0.2.0',
      '0.3.0',
      '0.2.1',
      '0.2.2',
      '1.0.0'
    ])
  })

  it('supports partial semver tags', async () => {
    mock('cmd', () => Promise.resolve([
      'v0.1---2000-02-01',
      'v0.2---2000-03-01',
      'v0.2.1---2000-03-02',
      'v0.2.2---2000-03-03',
      'v0.3---2000-04-01',
      'v1---2001-01-01'
    ].join('\n')))
    const tags = await fetchTags(options)
    expect(tags.map(t => t.version)).to.deep.equal([
      'v1.0.0',
      'v0.3.0',
      'v0.2.2',
      'v0.2.1',
      'v0.2.0',
      'v0.1.0'
    ])
  })

  it('supports --latest-version without v prefix', async () => {
    mock('cmd', () => Promise.resolve([
      '0.1.0---2000-02-01',
      '0.2.0---2000-03-01',
      '0.2.1---2000-03-02',
      '0.2.2---2000-03-03',
      '0.3.0---2000-04-01',
      '1.0.0---2001-01-01'
    ].join('\n')))
    const tags = await fetchTags({ ...options, latestVersion: '2.0.0' })
    expect(tags.map(t => t.title)).to.deep.equal([
      '2.0.0',
      '1.0.0',
      '0.3.0',
      '0.2.2',
      '0.2.1',
      '0.2.0',
      '0.1.0'
    ])
  })

  it('ignores invalid semver tags', async () => {
    mock('cmd', () => Promise.resolve([
      'v0.1.0---2000-02-01',
      'invalid-semver-tag---2000-03-01',
      'v0.2.0---2000-03-02'
    ].join('\n')))
    const tags = await fetchTags(options)
    expect(tags.map(t => t.version)).to.deep.equal([
      'v0.2.0',
      'v0.1.0'
    ])
  })
})
