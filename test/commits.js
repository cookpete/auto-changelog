import { describe, it } from 'mocha'
import { expect } from 'chai'

import log from './data/git-log'
import commits from './data/commits'
import { parseCommits, findFixes, findMerge } from '../src/commits'

describe('parseCommits', () => {
  it('parses commits', () => {
    expect(parseCommits(log)).to.deep.equal(commits)
  })
})

describe('findFixes', () => {
  it('returns null on fail', () => {
    const message = 'Commit message with no fixes'
    expect(findFixes(message)).to.equal(null)
  })

  it('finds single fixes', () => {
    const message = 'Commit that fixes #12'
    const expected = [ '#12' ]
    expect(findFixes(message)).to.deep.equal(expected)
  })

  it('finds fix in commit notes', () => {
    const message = 'Commit message\n\nCloses #8'
    const expected = [ '#8' ]
    expect(findFixes(message)).to.deep.equal(expected)
  })

  it('finds multiple fixes', () => {
    const message = 'Commit message\n\nFixes #1, fix #2, resolved #3, closes #4'
    const expected = ['#1', '#2', '#3', '#4']
    expect(findFixes(message)).to.deep.equal(expected)
  })

  it('finds fixes by issue URL', () => {
    const message = 'Commit message\n\nFixes https://github.com/user/repo/issues/1'
    const expected = ['https://github.com/user/repo/issues/1']
    expect(findFixes(message)).to.deep.equal(expected)
  })
})

describe('findMerge', () => {
  it('returns null on fail', () => {
    const message = 'Not a merge commit'
    expect(findMerge(message)).to.equal(null)
  })

  it('finds a merge', () => {
    const message = 'Merge pull request #3 from repo/branch\n\nPull request title'
    const expected = { pr: '#3', message: 'Pull request title' }
    expect(findMerge(message)).to.deep.equal(expected)
  })
})
