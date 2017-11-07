import { describe, it } from 'mocha'
import { expect } from 'chai'

import {
  fetchOrigin,
  __Rewire__ as mock,
  __ResetDependency__ as unmock
} from '../src/origin'

const origin = {
  github: {
    hostname: 'github.com',
    url: 'https://github.com/user/repo'
  },
  gitlab: {
    hostname: 'gitlab.com',
    url: 'https://gitlab.com/user/repo'
  },
  bitbucket: {
    hostname: 'bitbucket.org',
    url: 'https://bitbucket.org/user/repo'
  }
}

const TEST_DATA = [
  {
    remote: 'https://github.com/user/repo',
    expected: origin.github
  },
  {
    remote: 'https://github.com:8080/user/repo',
    expected: origin.github
  },
  {
    remote: 'git@github.com:user/repo.git',
    expected: origin.github
  },
  {
    remote: 'https://gitlab.com/user/repo',
    expected: origin.gitlab
  },
  {
    remote: 'git@gitlab.com:user/repo.git',
    expected: origin.gitlab
  },
  {
    remote: 'https://bitbucket.org/user/repo',
    expected: origin.bitbucket
  },
  {
    remote: 'git@bitbucket.org:user/repo.git',
    expected: origin.bitbucket
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
