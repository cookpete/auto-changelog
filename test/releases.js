// import { inspect } from 'util'

import { describe, it } from 'mocha'
import { expect } from 'chai'

import commits from './data/commits'
import releases from './data/releases'
import { parseReleases } from '../src/releases'

describe('parseReleases', () => {
  it('parses releases', () => {
    const result = parseReleases(commits)
    // console.log(inspect(result, false, null))
    expect(result).to.deep.equal(releases)
  })
})
