import { describe, it } from 'mocha'
import { expect } from 'chai'
import remotes from './data/remotes'
import commits from './data/commits'
import releases from './data/releases'
import { parseReleases, sortReleases } from '../src/releases'

const options = {
  unreleased: false,
  commitLimit: 3,
  backfillLimit: 3,
  tagPrefix: ''
}

describe('parseReleases', () => {
  it('parses releases', () => {
    expect(parseReleases(commits, remotes.github, {}, null, options)).to.deep.equal(releases)
  })

  it('parses releases with no commit limit', () => {
    expect(parseReleases(commits, remotes.github, {}, null, { ...options, commitLimit: false })).to.deep.equal(releases)
  })

  it('parses releases with backfill limit', () => {
    const releases = parseReleases(commits, remotes.github, {}, null, {
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

  it('parses releases with summary', () => {
    const releases = parseReleases(commits, remotes.bitbucket, {}, null, { ...options, releaseSummary: true })
    expect(releases[0].summary).to.equal('This is my major release description.\n\n- And a bullet point')
  })

  it('parses bitbucket releases', () => {
    const releases = parseReleases(commits, remotes.bitbucket, {}, null, options)
    expect(releases[0].href).to.equal('https://bitbucket.org/user/repo/compare/v1.0.0..v0.1.0')
  })

  it('parses azure devops releases', () => {
    const releases = parseReleases(commits, remotes.azure, {}, null, options)
    expect(releases[0].href).to.equal('https://dev.azure.com/user/project/_git/repo/branches?baseVersion=GTv1.0.0&targetVersion=GTv0.1.0&_a=commits')
  })

  it('parses visual studio releases', () => {
    const releases = parseReleases(commits, remotes.visualstudio, {}, null, options)
    expect(releases[0].href).to.equal('https://user.visualstudio.com/project/_git/repo/branches?baseVersion=GTv1.0.0&targetVersion=GTv0.1.0&_a=commits')
  })

  it('sorts releases in the correct order', () => {
    const releases = parseReleases(commits, remotes.bitbucket, {}, null, { ...options, unreleased: true })
    const tags = releases.map(item => item.tag)
    expect(tags).to.deep.equal([null, 'v1.0.0', 'v0.1.0', 'v0.0.2', 'v0.0.1'])
  })

  it('includes tag prefix in compare urls', () => {
    const releases = parseReleases(commits, remotes.bitbucket, {}, null, { ...options, tagPrefix: 'prefix-' })
    expect(releases[0].href).to.equal('https://bitbucket.org/user/repo/compare/prefix-v1.0.0..prefix-v0.1.0')
  })

  it('supports a version override', () => {
    const releases = parseReleases(commits, remotes.github, {}, 'v3.0.0', options)
    expect(releases).to.be.an('array')
    expect(releases[0]).to.have.property('tag', 'v3.0.0')
  })
})

describe('sortReleases', () => {
  it('compares semver tags', () => {
    expect(sortReleases({ tag: '1.0.0' }, { tag: '0.1.0' })).to.equal(-1)
    expect(sortReleases({ tag: '0.1.0' }, { tag: '1.0.0' })).to.equal(1)
    expect(sortReleases({ tag: '0.1.0' }, { tag: '0.1.0' })).to.equal(0)
  })

  it('supports null tags', () => {
    expect(sortReleases({ tag: '0.1.0' }, { tag: null })).to.equal(1)
    expect(sortReleases({ tag: null }, { tag: '0.1.0' })).to.equal(-1)
    expect(sortReleases({ tag: null }, { tag: null })).to.equal(-0)
  })
})
