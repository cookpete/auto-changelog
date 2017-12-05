import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import { readFile } from 'fs-extra'
import { join } from 'path'

import origins from './data/origins'
import commits from './data/commits'
import run, {
  __get__,
  __Rewire__ as mock,
  __ResetDependency__ as unmock
} from '../src/run'

const getOptions = __get__('getOptions')

describe('getOptions', () => {
  it('parses commit limit correctly', () => {
    const options = getOptions(['', '', '--commit-limit', '10'])
    expect(options.commitLimit).to.equal(10)
  })

  it('parses false commit limit correctly', () => {
    const options = getOptions(['', '', '--commit-limit', 'false'])
    expect(options.commitLimit).to.equal(false)
  })
})

describe('run', () => {
  beforeEach(() => {
    mock('pathExists', () => false)
    mock('readJson', () => null)
    mock('fetchOrigin', () => origins.github)
    mock('fetchCommits', () => commits)
    mock('writeFile', () => {})
  })

  afterEach(() => {
    unmock('pathExists')
    unmock('readJson')
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

  it('supports unreleased option', () => {
    return run(['', '', '--unreleased']).then(message => {
      expect(message).to.be.a('string')
      expect(message).to.have.string('bytes written to')
    })
  })

  it('uses options from package.json', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-keepachangelog.md'), 'utf-8')

    mock('pathExists', () => true)
    mock('readJson', () => ({
      'auto-changelog': {
        template: 'keepachangelog'
      }
    }))
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
