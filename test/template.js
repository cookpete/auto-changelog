import { describe, it } from 'mocha'
import { expect } from 'chai'
import { join } from 'path'
import { readFile } from '../src/utils'
import releases from './data/releases'
import { compileTemplate } from '../src/template'

describe('compileTemplate', () => {
  it('compiles using compact template', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-compact.md'))
    expect(await compileTemplate('compact', { releases })).to.equal(expected)
  })

  it('compiles using keepachangelog template', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-keepachangelog.md'))
    expect(await compileTemplate('keepachangelog', { releases })).to.equal(expected)
  })

  it('compiles using json template', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-json.json'))
    expect(await compileTemplate('json', { releases })).to.equal(expected)
  })

  it('compiles using path to template file', async () => {
    const path = join(__dirname, 'data', 'template-compact.md')
    const expected = await readFile(path)
    expect(await compileTemplate(path, { releases })).to.equal(expected)
  })

  it('compiles using url path', async () => {
    const path = 'https://raw.githubusercontent.com/CookPete/auto-changelog/master/templates/compact.hbs'
    const expected = await readFile(join(__dirname, 'data', 'template-compact.md'))
    expect(await compileTemplate(path, { releases })).to.equal(expected)
  })

  it('throws an error when no template found', done => {
    compileTemplate('not-found', { releases })
      .then(() => done('Should throw an error'))
      .catch(() => done())
  })
})
