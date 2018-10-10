import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import { join } from 'path'
import { readFile } from '../src/utils'
import remotes from './data/remotes'
import commits from './data/commits'
import commitsNoRemote from './data/commits-no-remote'
import run, {
  __get__,
  __Rewire__ as mock,
  __ResetDependency__ as unmock
} from '../src/run'

const getOptions = __get__('getOptions')

describe('getOptions', () => {
  it('parses commit limit correctly', async () => {
    const options = await getOptions(['', '', '--commit-limit', '10'])
    expect(options.commitLimit).to.equal(10)
  })

  it('parses false commit limit correctly', async () => {
    const options = await getOptions(['', '', '--commit-limit', 'false'])
    expect(options.commitLimit).to.equal(false)
  })
})

describe('run', () => {
  beforeEach(() => {
    mock('fileExists', () => false)
    mock('readJson', () => null)
    mock('fetchRemote', () => remotes.github)
    mock('fetchCommits', () => commits)
    mock('writeFile', () => {})
  })

  afterEach(() => {
    unmock('fileExists')
    unmock('readJson')
    unmock('fetchRemote')
    unmock('fetchCommits')
    unmock('writeFile')
  })

  it('generates a changelog', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-compact.md'))

    mock('writeFile', (output, log) => {
      expect(output).to.equal('CHANGELOG.md')
      expect(log).to.equal(expected)
    })

    return run(['', '']).then(message => {
      expect(message).to.be.a('string')
      expect(message).to.have.string('bytes written to')
    })
  })

  it('generates a changelog with no remote', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-compact-no-remote.md'))

    mock('fetchRemote', () => null)
    mock('fetchCommits', () => commitsNoRemote)
    mock('writeFile', (output, log) => {
      expect(output).to.equal('CHANGELOG.md')
      expect(log).to.equal(expected)
    })

    return run(['', ''])
  })

  it('uses options from package.json', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-keepachangelog.md'))

    mock('fileExists', () => true)
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
    mock('fileExists', () => true)
    mock('readJson', () => ({
      version: '2.0.0'
    }))
    mock('writeFile', (output, log) => {
      expect(log).to.include('v2.0.0')
    })

    return run(['', '', '--package'])
  })

  it('uses version from package.json with no prefix', async () => {
    mock('fileExists', () => true)
    mock('readJson', () => ({
      version: '2.0.0'
    }))
    mock('fetchCommits', () => commits.map(commit => {
      return {
        ...commit,
        tag: commit.tag ? commit.tag.replace('v', '') : null
      }
    }))
    mock('writeFile', (output, log) => {
      expect(log).to.include('2.0.0')
      expect(log).to.not.include('v2.0.0')
    })

    return run(['', '', '--package'])
  })

  it('command line options override options from package.json', async () => {
    mock('fileExists', () => true)
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

  it('uses options from .auto-changelog', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-keepachangelog.md'))
    mock('fileExists', (fileName) => {
      return fileName == '.auto-changelog'
    })
    mock('readJson', (fileName) => {
      return fileName == '.auto-changelog' ? {template: 'keepachangelog'} : null
    })
    mock('writeFile', (output, log) => {
      expect(output).to.equal('CHANGELOG.md')
      expect(log).to.equal(expected)
    })

    return run(['', ''])
  })

  it('command line options override options from .auto-changelog', async () => {
    mock('fileExists', (fileName) => {
      return fileName == '.auto-changelog'
    })
    mock('readJson', (fileName) => {
      return fileName == '.auto-changelog' ? {output: 'should-not-be-this.md'} : null
    })
    mock('writeFile', (output, log) => {
      expect(output).to.equal('should-be-this.md')
    })

    return run(['', '', '--output', 'should-be-this.md'])
  })

  it('.auto-changelog is ignored if package.json options are set', async () => {
    mock('fileExists', () => true)
    mock('readJson', () => ({
      'auto-changelog': {
        output: 'should-be-this.md'
      }
    }))
    mock('writeFile', (output, log) => {
      expect(output).to.equal('should-be-this.md')
    })

    return run(['', ''])
  })

  it('supports unreleased option', () => {
    mock('writeFile', (output, log) => {
      expect(log).to.include('Unreleased')
      expect(log).to.include('https://github.com/user/repo/compare/v1.0.0...HEAD')
    })
    return run(['', '', '--unreleased'])
  })

  it('supports includeBranch option', () => {
    mock('fetchCommits', (remote, options, branch) => {
      if (branch === 'another-branch') {
        return commits.concat({
          date: '2015-12-15T12:03:09.000Z',
          tag: 'v0.2.0'
        })
      }
      return commits
    })
    mock('writeFile', (output, log) => {
      expect(log).to.include('v0.2.0')
    })
    return run(['', '', '--include-branch', 'another-branch'])
  })

  it('supports breakingPattern option', () => {
    mock('fetchCommits', () => commits.map(commit => {
      if (/Some breaking change/.test(commit.message)) {
        return { ...commit, breaking: true }
      }
      return commit
    }))
    mock('writeFile', (output, log) => {
      expect(log).to.include('**Breaking change:** Some breaking change')
    })
    // No need to actually pass in the option here as we amend the commits
    return run(['', '', '--commit-limit', '0'])
  })

  it('does not error when using latest version option', () => {
    return run(['', '', '--latest-version', 'v3.0.0'])
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
