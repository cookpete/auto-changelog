import { describe, it } from 'mocha'
import { expect } from 'chai'

import origins from './data/origins'
import commits from './data/commits'
import releases from './data/releases'
import { parseReleases } from '../src/releases'

const options = {
  unreleased: false,
  commitLimit: 3
}

describe('parseReleases', () => {
  it('parses releases', () => {
    expect(parseReleases(commits, origins.github, null, options)).to.deep.equal(releases)
  })

  it('parses releases with no commit limit', () => {
    expect(parseReleases(commits, origins.github, null, { ...options, commitLimit: false })).to.deep.equal(releases)
  })

  it('parses bitbucket releases', () => {
    const releases = parseReleases(commits, origins.bitbucket, null, options)
    expect(releases[0].href).to.equal('https://bitbucket.org/user/repo/compare/v1.0.0%0Dv0.1.0')
  })

  it('supports a package version override', () => {
    const result = parseReleases(commits, origins.github, 'v3.0.0', options)
    expect(result).to.be.an('array')
    expect(result[0]).to.have.property('tag', 'v3.0.0')
  })
})
