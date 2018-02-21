import { describe, it } from 'mocha'
import { expect } from 'chai'

import remotes from './data/remotes'
import commits from './data/commits'
import releases from './data/releases'
import { parseReleases } from '../src/releases'

const options = {
  unreleased: false,
  commitLimit: 3,
  tagPrefix: ''
}

describe('parseReleases', () => {
  it('parses releases', () => {
    expect(parseReleases(commits, remotes.github, null, options)).to.deep.equal(releases)
  })

  it('parses releases with no commit limit', () => {
    expect(parseReleases(commits, remotes.github, null, { ...options, commitLimit: false })).to.deep.equal(releases)
  })

  it('parses bitbucket releases', () => {
    const releases = parseReleases(commits, remotes.bitbucket, null, options)
    expect(releases[0].href).to.equal('https://bitbucket.org/user/repo/compare/v1.0.0%0Dv0.1.0')
  })

  it('includes tag prefix in compare urls', () => {
    const releases = parseReleases(commits, remotes.bitbucket, null, { ...options, tagPrefix: 'prefix-' })
    expect(releases[0].href).to.equal('https://bitbucket.org/user/repo/compare/prefix-v1.0.0%0Dprefix-v0.1.0')
  })

  it('supports a version override', () => {
    const result = parseReleases(commits, remotes.github, 'v3.0.0', options)
    expect(result).to.be.an('array')
    expect(result[0]).to.have.property('tag', 'v3.0.0')
  })
})
