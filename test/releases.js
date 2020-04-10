const { describe, it, beforeEach, afterEach } = require('mocha')
const { expect } = require('chai')
const remotes = require('./data/remotes')
const { tags, commitsMap } = require('./data/commits-map')
const commitsSingleRelease = require('./data/commits-single-release')
const releases = require('./data/releases')
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
      tagPrefix: ''
    }
    const releases = await parseReleases(['v2.0.0', 'v1.0.0'], remotes.github, null, options)
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
    const releases = await parseReleases(['v1.0.0'], remotes.github, null, options)
    expect(releases[0].commits).to.have.lengthOf(1)
    expect(releases[0].commits[0]).to.include({ subject: 'Second commit' })
  })

  it('false commitLimit', async () => {
    const map = {
      'v1.0.0': generateCommits(['Fourth commit', 'Third commit', 'Second commit', 'First commit'])
    }
    mock('fetchCommits', diff => Promise.resolve(map[diff]))
    const options = { commitLimit: false }
    const releases = await parseReleases(['v1.0.0'], remotes.github, null, options)
    expect(releases[0].commits).to.have.lengthOf(4)
  })

  it('applies backfillLimit', async () => {
    const map = {
      'v1.0.0': generateCommits(['Second commit', 'First commit'])
    }
    mock('fetchCommits', diff => Promise.resolve(map[diff]))
    const options = { backfillLimit: 1 }
    const releases = await parseReleases(['v1.0.0'], remotes.github, null, options)
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
    const releases = await parseReleases(['v1.0.0'], remotes.github, null, options)
    expect(releases[0].commits).to.have.lengthOf(1)
    expect(releases[0].commits[0]).to.include({ subject: 'First commit' })
  })
})

const options = {
  unreleased: false,
  commitLimit: 3,
  backfillLimit: 3,
  tagPrefix: '',
  sortCommits: 'relevance'
}

describe('parseReleases (legacy)', () => {
  beforeEach(() => {
    mock('fetchCommits', diff => Promise.resolve(commitsMap[diff]))
  })

  afterEach(() => {
    unmock('fetchCommits')
  })

  it('parses releases', async () => {
    expect(await parseReleases(tags, remotes.github, null, options)).to.deep.equal(releases)
  })

  it('parses releases with no commit limit', async () => {
    expect(await parseReleases(tags, remotes.github, null, { ...options, commitLimit: false })).to.deep.equal(releases)
  })

  it('parses releases with backfill limit', async () => {
    const releases = await parseReleases(tags, remotes.github, null, {
      ...options,
      commitLimit: 0,
      backfillLimit: 1
    })
    for (const release of releases) {
      if (release.fixes.length === 0 && release.merges.length === 0) {
        expect(release.commits.length).to.equal(1)
      }
    }
  })

  it('parses releases with summary', async () => {
    const releases = await parseReleases(tags, remotes.bitbucket, null, { ...options, releaseSummary: true })
    expect(releases[0].summary).to.equal('This is my major release description.\n\n- And a bullet point')
  })

  it('parses bitbucket releases', async () => {
    const releases = await parseReleases(tags, remotes.bitbucket, null, options)
    expect(releases[0].href).to.equal('https://bitbucket.org/user/repo/compare/v1.0.0..v0.1.0')
  })

  it('parses azure devops releases', async () => {
    const releases = await parseReleases(tags, remotes.azure, null, options)
    expect(releases[0].href).to.equal('https://dev.azure.com/user/project/_git/repo/branches?baseVersion=GTv1.0.0&targetVersion=GTv0.1.0&_a=commits')
  })

  it('parses visual studio releases', async () => {
    const releases = await parseReleases(tags, remotes.visualstudio, null, options)
    expect(releases[0].href).to.equal('https://user.visualstudio.com/project/_git/repo/branches?baseVersion=GTv1.0.0&targetVersion=GTv0.1.0&_a=commits')
  })

  it('sorts releases in the correct order', async () => {
    const releases = await parseReleases(tags, remotes.bitbucket, null, { ...options, unreleased: true })
    expect(releases.map(item => item.tag)).to.deep.equal([null, 'v1.0.0', 'v0.1.0', 'v0.0.2', 'v0.0.1'])
  })

  it('includes tag prefix in compare urls', async () => {
    const releases = await parseReleases(tags, remotes.bitbucket, null, { ...options, tagPrefix: 'prefix-' })
    expect(releases[0].href).to.equal('https://bitbucket.org/user/repo/compare/prefix-v1.0.0..prefix-v0.1.0')
  })

  it('supports a version override', async () => {
    const releases = await parseReleases(tags, remotes.github, 'v3.0.0', options)
    expect(releases).to.be.an('array')
    expect(releases[0]).to.have.property('tag', 'v3.0.0')
  })

  it.skip('supports sortCommits options', async () => {
    const releases = await parseReleases(commitsSingleRelease, remotes.github, null, {
      ...options,
      sortCommits: 'date',
      commitLimit: false
    })
    expect(releases).to.be.an('array')
    expect(releases[0].commits.map(c => c.date)).to.deep.equal([
      '2015-12-14T17:06:12.000Z',
      '2015-12-29T21:18:19.000Z',
      '2015-12-29T21:19:19.000Z',
      '2015-12-29T21:57:19.000Z'
    ])
  })

  it('supports ignoreCommitPattern option', async () => {
    const options = { ignoreCommitPattern: 'Some breaking change' }
    const releases = await parseReleases(tags, remotes.github, null, options)
    expect(releases).to.have.length(4)
    expect(JSON.stringify(releases)).to.not.contain('Some breaking change')
  })
})
