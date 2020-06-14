const { describe, it, beforeEach, afterEach } = require('mocha')
const { expect } = require('chai')
const {
  fetchTags,
  __get__,
  __Rewire__: mock,
  __ResetDependency__: unmock
} = require('../src/tags')

const options = {
  tagPrefix: ''
}

const sortTags = __get__('sortTags')(options)

describe('fetchTags', () => {
  beforeEach(() => {
    mock('cmd', () => Promise.resolve('v0.1.0---2000-02-01\nv0.2.0---2000-03-01\nv0.2.1---2000-03-02\nv0.2.2---2000-03-03\nv0.3.0---2000-04-01\nv1.0.0---2001-01-01'))
  })

  afterEach(() => {
    unmock('cmd')
  })

  it('fetches tags', async () => {
    expect(await fetchTags(options)).to.deep.equal([
      { tag: 'v1.0.0', date: '2001-01-01' },
      { tag: 'v0.3.0', date: '2000-04-01' },
      { tag: 'v0.2.2', date: '2000-03-03' },
      { tag: 'v0.2.1', date: '2000-03-02' },
      { tag: 'v0.2.0', date: '2000-03-01' },
      { tag: 'v0.1.0', date: '2000-02-01' }
    ])
  })

  it('supports --starting-version', async () => {
    expect(await fetchTags({ ...options, startingVersion: 'v0.3.0' })).to.deep.equal([
      { tag: 'v1.0.0', date: '2001-01-01' },
      { tag: 'v0.3.0', date: '2000-04-01' }
    ])
  })
})

describe('sortTags', () => {
  it('compares semver tags', () => {
    expect(sortTags({ tag: '1.0.0' }, { tag: '0.1.0' })).to.equal(-1)
    expect(sortTags({ tag: '0.1.0' }, { tag: '1.0.0' })).to.equal(1)
    expect(sortTags({ tag: '0.1.0' }, { tag: '0.1.0' })).to.equal(0)
  })

  it('supports non-semver tags', () => {
    expect(sortTags({ tag: 'abc' }, { tag: 'def' })).to.equal(1)
    expect(sortTags({ tag: 'def' }, { tag: 'abc' })).to.equal(-1)
    expect(sortTags({ tag: 'abc' }, { tag: 'abc' })).to.equal(0)
  })

  it('supports non-semver numeric tags', () => {
    expect(sortTags({ tag: '22.1' }, { tag: '22.0' })).to.equal(-1)
    expect(sortTags({ tag: '22.0' }, { tag: '22.1' })).to.equal(1)
    expect(sortTags({ tag: '123.0' }, { tag: '22.1' })).to.equal(-1)
    expect(sortTags({ tag: '0.1' }, { tag: '0.01' })).to.equal(-1)
    expect(sortTags({ tag: '0.14' }, { tag: '0.2' })).to.equal(-1)
    expect(sortTags({ tag: '0.2' }, { tag: '0.14' })).to.equal(1)
  })

  it('supports partial semver tags', () => {
    expect(sortTags({ tag: 'v0.50.7' }, { tag: 'v0.51' })).to.equal(1)
    expect(sortTags({ tag: 'v0.51' }, { tag: 'v0.50.7' })).to.equal(-1)
    expect(sortTags({ tag: 'v0.6' }, { tag: 'v0.50.7' })).to.equal(1)
    expect(sortTags({ tag: 'v0.50.7' }, { tag: 'v0.6' })).to.equal(-1)
    expect(sortTags({ tag: 'v2' }, { tag: 'v11' })).to.equal(1)
    expect(sortTags({ tag: 'v11' }, { tag: 'v2' })).to.equal(-1)
  })
})
