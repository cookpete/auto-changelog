const test = require('tape')
const { createServer } = require('http')
const { join } = require('path')
const { readFile } = require('../src/utils')
const releases = require('./data/releases')
const { compileTemplate } = require('../src/template')

test('compileTemplate: compiles using compact template', async t => {
  const expected = await readFile(join(__dirname, 'data', 'template-compact.md'))
  t.equal(await compileTemplate(releases, { template: 'compact' }), expected)
})

test('compileTemplate: compiles using keepachangelog template', async t => {
  const expected = await readFile(join(__dirname, 'data', 'template-keepachangelog.md'))
  t.equal(await compileTemplate(releases, { template: 'keepachangelog' }), expected)
})

test('compileTemplate: compiles using json template', async t => {
  const expected = await readFile(join(__dirname, 'data', 'template-json.json'))
  t.equal(await compileTemplate(releases, { template: 'json' }), expected)
})

test('compileTemplate: compiles using path to template file', async t => {
  const path = join(__dirname, 'data', 'template-compact.md')
  const expected = await readFile(path)
  t.equal(await compileTemplate(releases, { template: path }), expected)
})

test('compileTemplate: compiles using url path', async t => {
  const template = await readFile(join(__dirname, '..', 'templates', 'compact.hbs'))
  const expected = await readFile(join(__dirname, 'data', 'template-compact.md'))
  const server = createServer((request, response) => response.end(template))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const { port } = server.address()
    t.equal(await compileTemplate(releases, { template: `http://127.0.0.1:${port}/compact.hbs` }), expected)
  } finally {
    server.close()
  }
})

test('compileTemplate: throws an error when no template found', t => {
  return compileTemplate(releases, { template: 'not-found' })
    .then(() => t.fail('Should throw an error'))
    .catch(() => t.pass('threw'))
})

test('compileTemplate: supports handlebarsSetup option', async t => {
  const path = join(__dirname, 'data', 'template-custom-helper.md')
  const expected = await readFile(join(__dirname, 'data', 'template-custom-helper-compiled.md'))
  t.equal(await compileTemplate(releases, {
    template: path,
    handlebarsSetup: './test/data/handlebars-setup.js'
  }), expected)
})
