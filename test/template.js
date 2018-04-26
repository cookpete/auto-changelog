import { describe, it } from 'mocha'
import { expect } from 'chai'
import { readFile } from 'fs-extra'
import { join } from 'path'
import Handlebars from 'handlebars'

import releases from './data/releases'
import { compileTemplate } from '../src/template'

describe('compileTemplate', () => {
  it('compiles using compact template', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-compact.md'), 'utf-8')
    expect(await compileTemplate('compact', { releases })).to.equal(expected)
  })

  it('compiles using keepachangelog template', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-keepachangelog.md'), 'utf-8')
    expect(await compileTemplate('keepachangelog', { releases })).to.equal(expected)
  })

  it('compiles using json template', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-json.json'), 'utf-8')
    expect(await compileTemplate('json', { releases })).to.equal(expected)
  })

  it('compiles using path to template file', async () => {
    const path = join(__dirname, 'data', 'template-compact.md')
    const expected = await readFile(path, 'utf-8')
    expect(await compileTemplate(path, { releases })).to.equal(expected)
  })

  it('throws an error when no template found', done => {
    compileTemplate('not-found', { releases })
      .then(() => done('Should throw an error'))
      .catch(() => done())
  })
})

describe('commit-list helper', () => {
  const commits = [
    { subject: 'Commit 1', message: 'Commit 1\n\nThis is commit 1, nothing special' },
    { subject: 'Commit 2', message: 'Commit 2\n\nBREAKING CHANGE: This commit breaks something' },
    { subject: 'feat: Commit 3', message: 'feat: Commit 3\n\nThis commit adds a feature' }
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
      '# Heading\n' +
      '- Commit 1\n' +
      '- Commit 2\n' +
      '- feat: Commit 3\n'
    expect(compile({ commits })).to.equal(expected)
  })

  it('supports subject pattern matching', () => {
    const compile = Handlebars.compile(
      '{{#commit-list commits heading="# Heading" subject="^feat: "}}\n' +
        '- {{subject}}\n' +
      '{{/commit-list}}'
    )
    const expected =
      '# Heading\n' +
      '- feat: Commit 3\n'
    expect(compile({ commits })).to.equal(expected)
  })

  it('supports message pattern matching', () => {
    const compile = Handlebars.compile(
      '{{#commit-list commits heading="# Breaking Changes" message="^BREAKING CHANGE: "}}\n' +
        '- {{subject}}\n' +
      '{{/commit-list}}'
    )
    const expected =
      '# Breaking Changes\n' +
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
      '# Heading\n' +
      '- Commit 1\n' +
      '- feat: Commit 3\n'
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
