import { describe, it } from 'mocha'
import { expect } from 'chai'

import commits from './data/commits'
import releases from './data/releases'
import { parseReleases } from '../src/releases'

const origin = {
  hostname: 'github.com',
  repoURL: 'https://github.com/user/repo',
  repo: 'user/repo'
}

describe('parseReleases', () => {
  it('parses releases', () => {
    expect(parseReleases(commits, origin, null, false)).to.deep.equal(releases)
  })

  it('supports a package version override', () => {
    const result = parseReleases(commits, origin, 'v3.0.0', false)
    expect(result).to.be.an('array')
    expect(result[0]).to.have.property('tag', 'v3.0.0')
  })
})
