import { describe, it } from 'mocha'
import { expect } from 'chai'

import commits from './data/commits'
import releases from './data/releases'
import { parseReleases } from '../src/releases'

describe('parseReleases', () => {
  it('parses releases', () => {
    const result = parseReleases(commits)
    expect(result).to.deep.equal(releases)
  })

  it('supports a package version override', () => {
    const result = parseReleases(commits, 'v3.0.0')
    expect(result).to.be.an('array')
    expect(result).to.have.deep.property('[0].tag', 'v3.0.0')
  })
})
