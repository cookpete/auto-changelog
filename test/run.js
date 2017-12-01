import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import { readFile } from 'fs-extra'
import { join } from 'path'

import origins from './data/origins'
import commits from './data/commits'
import run, {
  __Rewire__ as mock,
  __ResetDependency__ as unmock
} from '../src/run'

describe('run', () => {
  beforeEach(() => {
    mock('pathExists', () => false)
    mock('fetchOrigin', () => origins.github)
    mock('fetchCommits', () => commits)
    mock('writeFile', () => {})
  })

  afterEach(() => {
    unmock('pathExists')
    unmock('fetchOrigin')
    unmock('fetchCommits')
    unmock('writeFile')
  })

  it('generates a changelog', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-compact.md'), 'utf-8')

    mock('writeFile', (output, log) => {
      expect(output).to.equal('CHANGELOG.md')
      expect(log).to.equal(expected)
    })

    return run(['', '']).then(message => {
      expect(message).to.be.a('string')
      expect(message).to.have.string('bytes written to')
    })
  })

  it('throws an error when no package found', done => {
    run(['', '', '--package'])
      .then(() => done('Should throw an error'))
      .catch(() => done())
  })

  it('throws an error when no template found', done => {
    run(['', '', '--template', 'not-found'])
      .then(() => done('Should throw an error'))
      .catch(() => done())
  })
})
