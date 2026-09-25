const test = require('tape')
const {
  updateLog,
  cmd,
  niceDate,
  isLink,
  getGitVersion,
  readFile,
  writeFile,
  fileExists,
  readJson
} = require('../src/utils')

test('updateLog: doesn\'t error', t => {
  updateLog('Test', false)
  updateLog('Test')
  t.pass('did not error')
  t.end()
})

test('cmd: runs a command', async t => {
  const result = await cmd('node --version')
  t.equal(typeof result, 'string')
})

test('cmd: runs onProgress', async t => {
  const result = await cmd('node --version', bytes => t.equal(typeof bytes, 'number'))
  t.equal(typeof result, 'string')
})

test('niceDate: formats string into nice date', t => {
  t.match(niceDate('2015-10-03'), /^\d October 2015$/)
  t.match(niceDate('2017-11-07T19:19:02.635Z'), /^\d November 2017$/)
  t.end()
})

test('niceDate: formats date into nice date', t => {
  t.match(niceDate(new Date(2016, 8, 2)), /^\d September 2016$/)
  t.match(niceDate(new Date('2015-10-03')), /^\d October 2015$/)
  t.end()
})

test('isLink: returns true for links', t => {
  t.equal(isLink('http://test.com'), true)
  t.end()
})

test('isLink: returns false for non-links', t => {
  t.equal(isLink('not a link'), false)
  t.end()
})

test('getGitVersion: returns git version', async t => {
  t.equal(await getGitVersion({ cmd: () => 'git version 2.15.2 (Apple Git-101.1)' }), '2.15.2')
})

test('getGitVersion: returns null', async t => {
  t.equal(await getGitVersion({ cmd: () => 'some sort of random output' }), null)
})

test('readFile: reads file', async t => {
  t.equal(await readFile(null, { fs: { readFile: (path, type, cb) => cb(null, 'abc') } }), 'abc')
})

test('writeFile: reads file', async t => {
  t.equal(await writeFile(null, null, { fs: { writeFile: (path, data, cb) => cb(null, 'abc') } }), 'abc')
})

test('fileExists: reads file', async t => {
  t.equal(await fileExists(null, { fs: { access: (path, cb) => cb(null) } }), true)
})

test('readJson: reads file', async t => {
  const fs = {
    readFile: (path, type, cb) => cb(null, '{"abc":123}'),
    access: (path, cb) => cb(null)
  }
  t.deepEqual(await readJson(null, { fs }), { abc: 123 })
})
