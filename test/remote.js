import { describe, it } from 'mocha'
import { expect } from 'chai'

import remotes from './data/remotes'
import {
  fetchRemote,
  __Rewire__ as mock,
  __ResetDependency__ as unmock
} from '../src/remote'

const TEST_DATA = [
  {
    remote: 'https://github.com/user/repo',
    expected: remotes.github
  },
  {
    remote: 'https://github.com:8080/user/repo',
    expected: remotes.github
  },
  {
    remote: 'git@github.com:user/repo.git',
    expected: remotes.github
  },
  {
    remote: 'https://gitlab.com/user/repo',
    expected: remotes.gitlab
  },
  {
    remote: 'git@gitlab.com:user/repo.git',
    expected: remotes.gitlab
  },
  {
    remote: 'https://gitlab.com/user/repo/subgroup.git',
    expected: {
      hostname: 'gitlab.com',
      url: 'https://gitlab.com/user/repo/subgroup'
    }
  },
  {
    remote: 'git@gitlab.com:user/repo/subgroup.git',
    expected: {
      hostname: 'gitlab.com',
      url: 'https://gitlab.com/user/repo/subgroup'
    }
  },
  {
    remote: 'https://bitbucket.org/user/repo',
    expected: remotes.bitbucket
  },
  {
    remote: 'git@bitbucket.org:user/repo.git',
    expected: remotes.bitbucket
  }
]

describe('fetchRemote', () => {
  for (let test of TEST_DATA) {
    it(`parses ${test.remote}`, async () => {
      mock('cmd', () => test.remote)
      expect(await fetchRemote('origin')).to.include(test.expected)
      unmock('cmd')
    })
  }

  it('returns null', async () => {
    mock('cmd', () => '')
    expect(await fetchRemote('origin')).to.equal(null)
    unmock('cmd')
  })
})
