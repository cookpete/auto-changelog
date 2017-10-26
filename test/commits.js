import { describe, it } from 'mocha'
import { expect } from 'chai'
import { readFile } from 'fs-extra'
import { join } from 'path'

import commits from './data/commits'
import { __get__ } from '../src/commits'

const parseCommits = __get__('parseCommits')
// const parseCommit = __get__('parseCommit')
// const getTag = __get__('getTag')
// const getSubject = __get__('getSubject')
// const getStats = __get__('getStats')
const getFixes = __get__('getFixes')
const getMerge = __get__('getMerge')
// const getCommitLink = __get__('getCommitLink')
// const getIssueLink = __get__('getIssueLink')
// const getPullLink = __get__('getPullLink')

const origin = {
  github: {
    hostname: 'github.com',
    repoURL: 'https://github.com/user/repo',
    repo: 'user/repo'
  },
  gitlab: {
    hostname: 'gitlab.com',
    repoURL: 'https://gitlab.com/user/repo',
    repo: 'user/repo'
  },
  bitbucket: {
    hostname: 'bitbucket.org',
    repoURL: 'https://bitbucket.org/user/repo',
    repo: 'user/repo'
  }
}

describe('parseCommits', () => {
  it('parses commits', async () => {
    const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'), 'utf-8')
    expect(parseCommits(gitLog, origin.github)).to.deep.equal(commits)
  })
})

describe('getFixes', () => {
  it('returns null with no fixes', () => {
    const message = 'Commit message with no fixes'
    expect(getFixes(message, origin.github)).to.equal(null)
  })

  it('parses a single fix', () => {
    const message = 'Commit that fixes #12'
    expect(getFixes(message, origin.github)).to.deep.equal([
      { id: '12', href: 'https://github.com/user/repo/issues/12' }
    ])
  })

  it('parses fix in commit notes', () => {
    const message = 'Commit message\n\nCloses #8'
    expect(getFixes(message, origin.github)).to.deep.equal([
      { id: '8', href: 'https://github.com/user/repo/issues/8' }
    ])
  })

  it('parses multiple fixes', () => {
    const message = 'Commit message\n\nFixes #1, fix #2, resolved #3, closes #4'
    expect(getFixes(message, origin.github)).to.deep.equal([
      { id: '1', href: 'https://github.com/user/repo/issues/1' },
      { id: '2', href: 'https://github.com/user/repo/issues/2' },
      { id: '3', href: 'https://github.com/user/repo/issues/3' },
      { id: '4', href: 'https://github.com/user/repo/issues/4' }
    ])
  })

  it('parses fixes by issue URL', () => {
    const message = 'Commit message\n\nFixes https://github.com/user/repo/issues/1'
    expect(getFixes(message, origin.github)).to.deep.equal([
      { id: '1', href: 'https://github.com/user/repo/issues/1' }
    ])
  })

  it('parses external repo issues', () => {
    const message = 'Commit message\n\nFixes https://github.com/other-user/external-repo/issues/1'
    expect(getFixes(message, origin.github)).to.deep.equal([
      { id: '1', href: 'https://github.com/other-user/external-repo/issues/1' }
    ])
  })
})

describe('getMerge', () => {
  it('returns null on fail', () => {
    const message = 'Not a merge commit'
    expect(getMerge(message, origin.github)).to.equal(null)
  })

  describe('GitHub', () => {
    it('parses a merge', () => {
      const message = 'Merge pull request #3 from repo/branch\n\nPull request title'
      expect(getMerge(message, origin.github)).to.deep.equal({
        id: '3',
        message: 'Pull request title',
        href: 'https://github.com/user/repo/pulls/3'
      })
    })

    it('parses a squash merge', () => {
      const message = 'Update dependencies to enable Greenkeeper 🌴 (#10)\n\n* chore(package): update dependencies'
      expect(getMerge(message, origin.github)).to.deep.equal({
        id: '10',
        message: 'Update dependencies to enable Greenkeeper 🌴',
        href: 'https://github.com/user/repo/pulls/10'
      })
    })

    it('does not parse a not-quite squash merge', () => {
      const message = 'Update dependencies to enable Greenkeeper 🌴 (#10)\n\nSomething that isnt a squashed commit'
      expect(getMerge(message, origin.github)).to.equal(null)
    })
  })

  describe('GitLab', () => {
    it('parses a merge', () => {
      const message = 'Merge branch \'branch\' into \'master\'\n\nMemoize GitLab logger to reduce open file descriptors\n\nCloses gitlab-ee#3664\n\nSee merge request !15007'
      expect(getMerge(message, origin.gitlab)).to.deep.equal({
        id: '15007',
        message: 'Memoize GitLab logger to reduce open file descriptors',
        href: 'https://gitlab.com/user/repo/merge_requests/15007'
      })
    })
  })

  describe('BitBucket', () => {
    it('parses a merge', () => {
      const message = 'Merged in eshvedai/fix-schema-issue (pull request #4518)\n\nfix(component): re-export createSchema from editor-core\n\nApproved-by: Scott Sidwell <ssidwell@atlassian.com>'
      expect(getMerge(message, origin.bitbucket)).to.deep.equal({
        id: '4518',
        message: 'fix(component): re-export createSchema from editor-core',
        href: 'https://bitbucket.org/user/repo/pull-requests/4518'
      })
    })
  })
})
