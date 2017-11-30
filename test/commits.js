import { describe, it } from 'mocha'
import { expect } from 'chai'
import { readFile } from 'fs-extra'
import { join } from 'path'

import origins from './data/origins'
import commits from './data/commits'
import { __get__ } from '../src/commits'

const parseCommits = __get__('parseCommits')
const getFixes = __get__('getFixes')
const getMerge = __get__('getMerge')

describe('parseCommits', () => {
  it('parses commits', async () => {
    const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'), 'utf-8')
    expect(parseCommits(gitLog, origins.github)).to.deep.equal(commits)
  })
})

describe('getFixes', () => {
  it('returns null with no fixes', () => {
    const message = 'Commit message with no fixes'
    expect(getFixes(message, origins.github)).to.equal(null)
  })

  it('parses a single fix', () => {
    const message = 'Commit that fixes #12'
    expect(getFixes(message, origins.github)).to.deep.equal([
      { id: '12', href: 'https://github.com/user/repo/issues/12' }
    ])
  })

  it('parses fix in commit notes', () => {
    const message = 'Commit message\n\nCloses #8'
    expect(getFixes(message, origins.github)).to.deep.equal([
      { id: '8', href: 'https://github.com/user/repo/issues/8' }
    ])
  })

  it('parses multiple fixes', () => {
    const message = 'Commit message\n\nFixes #1, fix #2, resolved #3, closes #4'
    expect(getFixes(message, origins.github)).to.deep.equal([
      { id: '1', href: 'https://github.com/user/repo/issues/1' },
      { id: '2', href: 'https://github.com/user/repo/issues/2' },
      { id: '3', href: 'https://github.com/user/repo/issues/3' },
      { id: '4', href: 'https://github.com/user/repo/issues/4' }
    ])
  })

  it('parses fixes by issue URL', () => {
    const message = 'Commit message\n\nFixes https://github.com/user/repo/issues/1'
    expect(getFixes(message, origins.github)).to.deep.equal([
      { id: '1', href: 'https://github.com/user/repo/issues/1' }
    ])
  })

  it('parses multiple fixes by issue URL', () => {
    const message = 'Commit message\n\nFixes https://github.com/user/repo/issues/1 and fixes https://github.com/user/repo/issues/2'
    expect(getFixes(message, origins.github)).to.deep.equal([
      { id: '1', href: 'https://github.com/user/repo/issues/1' },
      { id: '2', href: 'https://github.com/user/repo/issues/2' }
    ])
  })

  it('parses external repo issues', () => {
    const message = 'Commit message\n\nFixes https://github.com/other-user/external-repo/issues/1'
    expect(getFixes(message, origins.github)).to.deep.equal([
      { id: '1', href: 'https://github.com/other-user/external-repo/issues/1' }
    ])
  })

  it('supports issueUrl parameter', () => {
    const message = 'Commit message\n\nCloses #8'
    expect(getFixes(message, origins.github, 'http://example.com/issues/{id}')).to.deep.equal([
      { id: '8', href: 'http://example.com/issues/8' }
    ])
  })
})

describe('getMerge', () => {
  it('returns null on fail', () => {
    const message = 'Not a merge commit'
    expect(getMerge(message, origins.github)).to.equal(null)
  })

  describe('GitHub', () => {
    it('parses a merge', () => {
      const message = 'Merge pull request #3 from repo/branch\n\nPull request title'
      expect(getMerge(message, origins.github)).to.deep.equal({
        id: '3',
        message: 'Pull request title',
        href: 'https://github.com/user/repo/pull/3'
      })
    })

    it('parses a squash merge', () => {
      const message = 'Update dependencies to enable Greenkeeper 🌴 (#10)\n\n* chore(package): update dependencies'
      expect(getMerge(message, origins.github)).to.deep.equal({
        id: '10',
        message: 'Update dependencies to enable Greenkeeper 🌴',
        href: 'https://github.com/user/repo/pull/10'
      })
    })

    it('parses a broken message squash merge', () => {
      const message = 'Expose minify and manifest options for the web preset, allow passing …\n\n…false to exclude. (#465)'
      expect(getMerge(message, origins.github)).to.deep.equal({
        id: '465',
        message: 'Expose minify and manifest options for the web preset, allow passing false to exclude.',
        href: 'https://github.com/user/repo/pull/465'
      })
    })

    it('parses a squash merge with no message', () => {
      const message = 'Generate changelogs that show the commits between tags (#411)'
      expect(getMerge(message, origins.github)).to.deep.equal({
        id: '411',
        message: 'Generate changelogs that show the commits between tags',
        href: 'https://github.com/user/repo/pull/411'
      })
    })
  })

  describe('GitLab', () => {
    it('parses a merge', () => {
      const message = 'Merge branch \'branch\' into \'master\'\n\nMemoize GitLab logger to reduce open file descriptors\n\nCloses gitlab-ee#3664\n\nSee merge request !15007'
      expect(getMerge(message, origins.gitlab)).to.deep.equal({
        id: '15007',
        message: 'Memoize GitLab logger to reduce open file descriptors',
        href: 'https://gitlab.com/user/repo/merge_requests/15007'
      })
    })
  })

  describe('BitBucket', () => {
    it('parses a merge', () => {
      const message = 'Merged in eshvedai/fix-schema-issue (pull request #4518)\n\nfix(component): re-export createSchema from editor-core\n\nApproved-by: Scott Sidwell <ssidwell@atlassian.com>'
      expect(getMerge(message, origins.bitbucket)).to.deep.equal({
        id: '4518',
        message: 'fix(component): re-export createSchema from editor-core',
        href: 'https://bitbucket.org/user/repo/pull-requests/4518'
      })
    })
  })
})
