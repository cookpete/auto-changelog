import { describe, it } from 'mocha'
import { expect } from 'chai'
import { join } from 'path'
import { readFile } from '../src/utils'
import releases from './data/releases'
import { compileTemplate } from '../src/template'

describe('compileTemplate', () => {
  it('compiles using compact template', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-compact.md'))
    expect(await compileTemplate({ template: 'compact' }, { releases })).to.equal(expected)
  })

  it('compiles using keepachangelog template', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-keepachangelog.md'))
    expect(await compileTemplate({ template: 'keepachangelog' }, { releases })).to.equal(expected)
  })

  it('compiles using json template', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-json.json'))
    expect(await compileTemplate({ template: 'json' }, { releases })).to.equal(expected)
  })

  it('compiles using path to template file', async () => {
    const path = join(__dirname, 'data', 'template-compact.md')
    const expected = await readFile(path)
    expect(await compileTemplate({ template: path }, { releases })).to.equal(expected)
  })

  it('compiles using url path', async () => {
    const path = 'https://raw.githubusercontent.com/CookPete/auto-changelog/master/templates/compact.hbs'
    const expected = await readFile(join(__dirname, 'data', 'template-compact.md'))
    expect(await compileTemplate({ template: path }, { releases })).to.equal(expected)
  }).timeout(10000)

  it('throws an error when no template found', done => {
    compileTemplate({ template: 'not-found' }, { releases })
      .then(() => done('Should throw an error'))
      .catch(() => done())
  })

  it('supports handlebarsSetup option', async () => {
    const path = join(__dirname, 'data', 'template-custom-helper.md')
    const expected = await readFile(join(__dirname, 'data', 'template-custom-helper-compiled.md'))
    expect(await compileTemplate({
      template: path,
      handlebarsSetup: './test/data/handlebars-setup.js'
    }, { releases })).to.equal(expected)
  })
})
