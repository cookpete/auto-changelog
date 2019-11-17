import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import {
  fetchTags,
  __get__,
  __Rewire__ as mock,
  __ResetDependency__ as unmock
} from '../src/tags'

const options = {
  tagPrefix: ''
}

const sortTags = __get__('sortTags')(options)

describe.only('fetchTags', () => {
  beforeEach(() => {
    mock('cmd', () => Promise.resolve('v0.1.0\nv0.2.0\nv0.2.1\nv0.2.2\nv0.3.0\nv1.0.0'))
  })

  afterEach(() => {
    unmock('cmd')
  })

  it('fetches tags', async () => {
    expect(await fetchTags(options)).to.deep.equal([
      'v1.0.0',
      'v0.3.0',
      'v0.2.2',
      'v0.2.1',
      'v0.2.0',
      'v0.1.0'
    ])
  })
})

describe('sortTags', () => {
  it('compares semver tags', () => {
    expect(sortTags('1.0.0', '0.1.0')).to.equal(-1)
    expect(sortTags('0.1.0', '1.0.0')).to.equal(1)
    expect(sortTags('0.1.0', '0.1.0')).to.equal(0)
  })

  it('supports non-semver tags', () => {
    expect(sortTags('abc', 'def')).to.equal(1)
    expect(sortTags('def', 'abc')).to.equal(-1)
    expect(sortTags('abc', 'abc')).to.equal(0)
  })

  it('supports non-semver numeric tags', () => {
    expect(sortTags('22.1', '22.0')).to.equal(-1)
    expect(sortTags('22.0', '22.1')).to.equal(1)
    expect(sortTags('123.0', '22.1')).to.equal(-1)
    expect(sortTags('0.1', '0.01')).to.equal(-1)
    expect(sortTags('0.14', '0.2')).to.equal(-1)
    expect(sortTags('0.2', '0.14')).to.equal(1)
  })

  it('supports partial semver tags', () => {
    expect(sortTags('v0.50.7', 'v0.51')).to.equal(1)
    expect(sortTags('v0.51', 'v0.50.7')).to.equal(-1)
    expect(sortTags('v0.6', 'v0.50.7')).to.equal(1)
    expect(sortTags('v0.50.7', 'v0.6')).to.equal(-1)
    expect(sortTags('v2', 'v11')).to.equal(1)
    expect(sortTags('v11', 'v2')).to.equal(-1)
  })
})
