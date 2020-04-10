import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import { join } from 'path'
import { readFile } from '../src/utils'
import remotes from './data/remotes'
import releases from './data/releases'
import { tags, commitsMap } from './data/commits-map'
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

  it('parses --issue-url correctly when given --issue-url', async () => {
    const options = await getOptions(['', '', '--issue-url', 'https://test.issue.local/issues/{id}'])
    expect(options.issueUrl).to.equal('https://test.issue.local/issues/{id}')
  })

  it('parses -i correctly when given -i', async () => {
    const options = await getOptions(['', '', '-i', 'https://test.issue.local/issues/{id}'])
    expect(options.issueUrl).to.equal('https://test.issue.local/issues/{id}')
  })
})

describe('run', () => {
  beforeEach(() => {
    mock('fileExists', () => false)
    mock('readJson', () => null)
    mock('fetchRemote', () => remotes.github)
    mock('fetchTags', () => Promise.resolve(tags))
    mock('parseReleases', () => Promise.resolve(releases))
    mock('writeFile', () => {})
    mock('log', () => {})
  })

  afterEach(() => {
    unmock('fileExists')
    unmock('readJson')
    unmock('fetchRemote')
    unmock('fetchTags')
    unmock('parseReleases')
    unmock('writeFile')
    unmock('log')
  })

  it('generates a changelog', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-compact.md'))

    mock('writeFile', (output, log) => {
      expect(output).to.equal('CHANGELOG.md')
      expect(log).to.equal(expected)
    })

    return run(['', ''])
  })

  it.skip('generates a changelog with no remote', async () => {
    const expected = await readFile(join(__dirname, 'data', 'template-compact-no-remote.md'))

    mock('fetchRemote', () => remotes.null)
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

  it.skip('uses version from package.json', async () => {
    mock('fileExists', () => true)
    mock('readJson', () => ({
      version: '2.0.0'
    }))
    mock('writeFile', (output, log) => {
      expect(log).to.include('v2.0.0')
    })

    return run(['', '', '--package'])
  })

  it.skip('uses version from custom package file', async () => {
    mock('fileExists', () => true)
    mock('readJson', file => {
      if (file === 'test.json') {
        return { version: '2.0.0' }
      }
      return {}
    })
    mock('writeFile', (output, log) => {
      expect(log).to.include('v2.0.0')
    })

    return run(['', '', '--package', 'test.json'])
  })

  it.skip('uses version from package.json with no prefix', async () => {
    mock('fileExists', () => true)
    mock('readJson', () => ({
      version: '2.0.0'
    }))
    mock('fetchTags', () => Promise.resolve(tags.map(tag => tag.replace('v', ''))))
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
    mock('fileExists', path => path === '.auto-changelog')
    mock('readJson', path => {
      return path === '.auto-changelog' ? { template: 'keepachangelog' } : null
    })
    mock('writeFile', (output, log) => {
      expect(log).to.equal(expected)
    })

    return run(['', ''])
  })

  it('command line options override options from .auto-changelog', async () => {
    mock('fileExists', () => true)
    mock('readJson', (path) => {
      return path === '.auto-changelog' ? { output: 'should-not-be-this.md' } : null
    })
    mock('writeFile', (output, log) => {
      expect(output).to.equal('should-be-this.md')
    })

    return run(['', '', '--output', 'should-be-this.md'])
  })

  it.skip('supports unreleased option', () => {
    mock('writeFile', (output, log) => {
      expect(log).to.include('Unreleased')
      expect(log).to.include('https://github.com/user/repo/compare/v1.0.0...HEAD')
    })
    return run(['', '', '--unreleased'])
  })

  it.skip('supports breakingPattern option', () => {
    const addBreakingFlag = commit => {
      if (/Some breaking change/.test(commit.message)) {
        return { ...commit, breaking: true }
      }
      return commit
    }
    mock('fetchCommits', diff => Promise.resolve(commitsMap[diff].map(addBreakingFlag)))
    mock('writeFile', (output, log) => {
      expect(log).to.include('**Breaking change:** Some breaking change')
    })
    // No need to actually pass in the option here as we amend the commits
    return run(['', '', '--commit-limit', '0'])
  })

  it.skip('supports releaseSummary option', () => {
    mock('writeFile', (output, log) => {
      expect(log).to.include('This is my major release description.\n\n- And a bullet point')
    })
    return run(['', '', '--release-summary'])
  })

  it('does not error when using latest version option', () => {
    return run(['', '', '--latest-version', 'v3.0.0'])
  })

  // For some reason is preventing the fetchTags test from running…?`
  it.skip('does not error when using stdout option', () => {
    return run(['', '', '--stdout'])
  })

  it('throws an error when no package found', done => {
    run(['', '', '--package'])
      .then(() => done('Should throw an error'))
      .catch(() => done())
  })

  it('throws an error when no custom package found', done => {
    run(['', '', '--package', 'does-not-exist.json'])
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
