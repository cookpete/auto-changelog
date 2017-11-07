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

  it('supports a package version override', () => {
    const result = parseReleases(commits, origins.github, 'v3.0.0', options)
    expect(result).to.be.an('array')
    expect(result[0]).to.have.property('tag', 'v3.0.0')
  })
})
