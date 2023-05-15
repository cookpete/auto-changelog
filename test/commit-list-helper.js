const { describe, it } = require('mocha')
const { expect } = require('chai')
const Handlebars = require('handlebars')

describe('commit-list helper', () => {
  const commits = [
    { subject: 'Commit 1', message: 'Commit 1\n\nThis is commit 1, nothing special' },
    { subject: 'Commit 2', message: 'Commit 2\n\nBREAKING CHANGE: This commit breaks something' },
    { subject: 'feat: Commit 3', message: 'feat: Commit 3\n\nThis commit adds a feature' },
    { subject: 'fix: Commit 4', message: 'fix: Commit 4\n\nThis commit adds a fix' }
  ]

  const merges = [
    { commit: commits[0] },
    { commit: commits[1] },
    { commit: commits[2] },
    { commit: commits[3] }
  ]

  it('returns nothing with no commits', () => {
    const compile = Handlebars.compile(
      '{{#commit-list commits heading="# Heading"}}\n' +
        '- {{subject}}\n' +
      '{{/commit-list}}'
    )
    const expected = ''
    expect(compile({ commits: [] })).to.equal(expected)
  })

  it('returns all commits with no options', () => {
    const compile = Handlebars.compile(
      '{{#commit-list commits heading="# Heading"}}\n' +
        '- {{subject}}\n' +
      '{{/commit-list}}'
    )
    const expected =
      '# Heading\n\n' +
      '- Commit 1\n' +
      '- Commit 2\n' +
      '- feat: Commit 3\n' +
      '- fix: Commit 4\n'

    expect(compile({ commits })).to.equal(expected)
  })

  it('supports subject pattern matching', () => {
    const compile = Handlebars.compile(
      '{{#commit-list commits heading="# Heading" subject="^feat: "}}\n' +
        '- {{subject}}\n' +
      '{{/commit-list}}'
    )
    const expected =
      '# Heading\n\n' +
      '- feat: Commit 3\n'
    expect(compile({ commits })).to.equal(expected)
  })

  it('supports merge subject pattern matching', () => {
    const compile = Handlebars.compile(
      '{{#commit-list merges heading="# Heading" subject="^feat: "}}\n' +
        '- {{commit.subject}}\n' +
      '{{/commit-list}}'
    )
    const expected =
      '# Heading\n\n' +
      '- feat: Commit 3\n'
    expect(compile({ merges })).to.equal(expected)
  })

  it('supports commit lists with no heading', () => {
    const compile = Handlebars.compile(
      '{{#commit-list merges heading="# Heading" subject="^fix: "}}\n' +
        '- {{commit.subject}}\n' +
      '{{/commit-list}}\n' +
      '{{#commit-list commits subject="^fix: "}}\n' +
        '- {{subject}}\n' +
      '{{/commit-list}}\n'
    )
    const expectedMerges =
      '# Heading\n\n' +
      '- fix: Commit 4\n'
    const expectedCommits = '- fix: Commit 4\n'
    expect(compile({ merges })).to.equal(expectedMerges)
    expect(compile({ commits })).to.equal(expectedCommits)
  })

  it('supports message pattern matching', () => {
    const compile = Handlebars.compile(
      '{{#commit-list commits heading="# Breaking Changes" message="^BREAKING CHANGE: "}}\n' +
        '- {{subject}}\n' +
      '{{/commit-list}}'
    )
    const expected =
      '# Breaking Changes\n\n' +
      '- Commit 2\n'
    expect(compile({ commits })).to.equal(expected)
  })

  it('supports excludes option', () => {
    const compile = Handlebars.compile(
      '{{#commit-list commits heading="# Heading" exclude="^BREAKING CHANGE: "}}\n' +
        '- {{subject}}\n' +
      '{{/commit-list}}'
    )
    const expected =
      '# Heading\n\n' +
      '- Commit 1\n' +
      '- feat: Commit 3\n' +
      '- fix: Commit 4\n'
    expect(compile({ commits })).to.equal(expected)
  })

  it('returns nothing if nothing matches', () => {
    const compile = Handlebars.compile(
      '{{#commit-list commits heading="# Heading" message="A string that never appears"}}\n' +
        '- {{subject}}\n' +
      '{{/commit-list}}'
    )
    const expected = ''
    expect(compile({ commits })).to.equal(expected)
  })
})
