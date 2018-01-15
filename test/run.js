import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import { readFile } from 'fs-extra'
import { join } from 'path'

import origins from './data/origins'
import commits from './data/commits'
import commitsNoOrigin from './data/commits-no-origin'
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

  it('generates a changelog with no origin', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-compact-no-origin.md'), 'utf-8')

    mock('fetchOrigin', () => null)
    mock('fetchCommits', () => commitsNoOrigin)
    mock('writeFile', (output, log) => {
      expect(output).to.equal('CHANGELOG.md')
      expect(log).to.equal(expected)
    })

    return run(['', ''])
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

    return run(['', ''])
  })

  it('uses version from package.json', async () => {
    mock('pathExists', () => true)
    mock('readJson', () => ({
      version: '2.0.0'
    }))
    mock('writeFile', (output, log) => {
      expect(log).to.include('v2.0.0')
    })

    return run(['', '', '--package'])
  })

  it('command line options override options from package.json', async () => {
    mock('pathExists', () => true)
    mock('readJson', () => ({
      'auto-changelog': {
        output: 'should-not-be-this.md'
      }
    }))
    mock('writeFile', (output, log) => {
      expect(output).to.equal('should-be-this.md')
    })

    return run(['', '', '--output', 'should-be-this.md'])
  })

  it('does not error when using unreleased option', () => {
    return run(['', '', '--unreleased'])
  })

  it('does not error when using latest version option', () => {
    return run(['', '', '--latest-version', '3.0.0'])
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

  it('throws an error when given an invalid latest version', done => {
    run(['', '', '--latest-version', 'invalid'])
      .then(() => done('Should throw an error'))
      .catch(() => done())
  })
})
