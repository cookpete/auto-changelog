import { describe, it } from 'mocha'
import { expect } from 'chai'

import origins from './data/origins'
import {
  fetchOrigin,
  __Rewire__ as mock,
  __ResetDependency__ as unmock
} from '../src/origin'

const TEST_DATA = [
  {
    remote: 'https://github.com/user/repo',
    expected: origins.github
  },
  {
    remote: 'https://github.com:8080/user/repo',
    expected: origins.github
  },
  {
    remote: 'git@github.com:user/repo.git',
    expected: origins.github
  },
  {
    remote: 'https://gitlab.com/user/repo',
    expected: origins.gitlab
  },
  {
    remote: 'git@gitlab.com:user/repo.git',
    expected: origins.gitlab
  },
  {
    remote: 'https://bitbucket.org/user/repo',
    expected: origins.bitbucket
  },
  {
    remote: 'git@bitbucket.org:user/repo.git',
    expected: origins.bitbucket
  }
]

describe('fetchOrigin', () => {
  for (let test of TEST_DATA) {
    it(`parses ${test.remote}`, async () => {
      mock('cmd', () => test.remote)
      expect(await fetchOrigin('origin')).to.include(test.expected)
      unmock('cmd')
    })
  }

  it('throws an error', done => {
    mock('cmd', () => '')
    fetchOrigin('origin').catch(() => done())
    unmock('cmd')
  })
})
