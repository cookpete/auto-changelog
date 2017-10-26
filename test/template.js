import { describe, it } from 'mocha'
import { expect } from 'chai'
import { readFile } from 'fs-extra'
import { join } from 'path'

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
})
