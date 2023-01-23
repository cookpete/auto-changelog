const { describe, it } = require('mocha')
const { expect } = require('chai')
const { join } = require('path')
const { readFile } = require('../src/utils')
const releases = require('./data/releases')
const metadata = require('./data/metadata')
const { compileTemplate } = require('../src/template')

describe('compileTemplate', () => {
  it('compiles using compact template', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-compact.md'))
    expect(await compileTemplate(releases, {}, { template: 'compact' })).to.equal(expected)
  })

  it('compiles using keepachangelog template', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-keepachangelog.md'))
    expect(await compileTemplate(releases, {}, { template: 'keepachangelog' })).to.equal(expected)
  })

  it('compiles using json template', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-json.json'))
    expect(await compileTemplate(releases, {}, { template: 'json' })).to.equal(expected)
  })

  it('compiles using path to template file', async () => {
    const path = join(__dirname, 'data', 'template-compact.md')
    const expected = await readFile(path)
    expect(await compileTemplate(releases, {}, { template: path })).to.equal(expected)
  })

  it('compiles using url path', async () => {
    const path = 'https://raw.githubusercontent.com/CookPete/auto-changelog/master/templates/compact.hbs'
    const expected = await readFile(join(__dirname, 'data', 'template-compact.md'))
    expect(await compileTemplate(releases, {}, { template: path })).to.equal(expected)
  }).timeout(10000)

  it('throws an error when no template found', done => {
    compileTemplate(releases, {}, { template: 'not-found' })
      .then(() => done('Should throw an error'))
      .catch(() => done())
  })

  it('supports handlebarsSetup option', async () => {
    const path = join(__dirname, 'data', 'template-custom-helper.md')
    const expected = await readFile(join(__dirname, 'data', 'template-custom-helper-compiled.md'))
    expect(await compileTemplate(releases, {}, {
      template: path,
      handlebarsSetup: './test/data/handlebars-setup.js'
    })).to.equal(expected)
  })

  it('compiles using metadata template', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-metadata.md'))
    expect(await compileTemplate(releases, metadata, {
      template: 'metadata',
    })).to.equal(expected)
  })
})
