import { describe, it } from 'mocha'
import { expect } from 'chai'

import { uniq } from '../src/utils'

describe('uniq', () => {
  it('filters duplicates', () => {
    const array = [
      { a: 1, b: 2 },
      { a: 2, b: 3 },
      { a: 1, b: 2 },
      { a: 3, b: 4 }
    ]
    const expected = [
      { a: 1, b: 2 },
      { a: 2, b: 3 },
      { a: 3, b: 4 }
    ]
    expect(uniq(array, 'a')).to.deep.equal(expected)
  })
})
