const test = require('tape')
const { join } = require('path')
const { readFile } = require('../src/utils')
const remotes = require('./data/remotes')
const releases = require('./data/releases')
const { tags } = require('./data/commits-map')
const { run } = require('../src/run')
const getOptions = require('../src/options')

const deps = {
  fileExists: () => false,
  readJson: () => null,
  fetchRemote: () => remotes.github,
  fetchTags: () => Promise.resolve(tags),
  parseReleases: () => Promise.resolve(releases),
  writeFile: () => {}
}

test('getOptions: parses commit limit correctly', async t => {
  const options = await getOptions(['', '', '--commit-limit', '10'])
  t.equal(options.commitLimit, 10)
})

test('getOptions: parses false commit limit correctly', async t => {
  const options = await getOptions(['', '', '--commit-limit', 'false'])
  t.equal(options.commitLimit, false)
})

test('getOptions: parses --issue-url correctly when given --issue-url', async t => {
  const options = await getOptions(['', '', '--issue-url', 'https://test.issue.local/issues/{id}'])
  t.equal(options.issueUrl, 'https://test.issue.local/issues/{id}')
})

test('getOptions: parses -i correctly when given -i', async t => {
  const options = await getOptions(['', '', '-i', 'https://test.issue.local/issues/{id}'])
  t.equal(options.issueUrl, 'https://test.issue.local/issues/{id}')
})

test('getOptions: autodetects a monorepo via repository.directory and derives the tag prefix', async t => {
  const readJson = file => (file === 'package.json'
    ? { name: 'my-package', repository: { directory: 'packages/my-package' }, 'auto-changelog': { autodetectMonorepoDisabled: false } }
    : null)
  const options = await getOptions(['', ''], { readJson })
  t.equal(options.tagPrefix, 'my-package@')
  t.equal(options.stripTagPrefix, true)
})

test('getOptions: autodetects a monorepo via an ancestor workspaces field', async t => {
  const readJson = file => {
    if (file === 'package.json') return { name: 'my-package', 'auto-changelog': { autodetectMonorepoDisabled: false } }
    if (file.endsWith('package.json')) return { workspaces: ['packages/*'] }
    return null
  }
  const options = await getOptions(['', ''], { readJson })
  t.equal(options.tagPrefix, 'my-package@')
  t.equal(options.stripTagPrefix, true)
})

test('getOptions: does not override an explicitly configured tag prefix', async t => {
  const readJson = file => (file === 'package.json'
    ? { name: 'my-package', repository: { directory: 'packages/my-package' }, 'auto-changelog': { autodetectMonorepoDisabled: false, tagPrefix: 'custom/' } }
    : null)
  const options = await getOptions(['', ''], { readJson })
  t.equal(options.tagPrefix, 'custom/')
  t.equal(options.stripTagPrefix, true)
})

test('getOptions: does not autodetect when the package is not in a monorepo', async t => {
  const readJson = file => (file === 'package.json'
    ? { name: 'my-package', 'auto-changelog': { autodetectMonorepoDisabled: false } }
    : null)
  const options = await getOptions(['', ''], { readJson })
  t.equal(options.tagPrefix, '')
  t.notOk(options.stripTagPrefix)
})

test('getOptions: does not autodetect a monorepo by default', async t => {
  const readJson = file => (file === 'package.json'
    ? { name: 'my-package', repository: { directory: 'packages/my-package' } }
    : null)
  const options = await getOptions(['', ''], { readJson })
  t.equal(options.autodetectMonorepoDisabled, true)
  t.equal(options.tagPrefix, '')
  t.notOk(options.stripTagPrefix)
})

test('getOptions: --no-autodetect-monorepo-disabled enables autodetection', async t => {
  const readJson = file => (file === 'package.json'
    ? { name: 'my-package', repository: { directory: 'packages/my-package' } }
    : null)
  const options = await getOptions(['', '', '--no-autodetect-monorepo-disabled'], { readJson })
  t.equal(options.autodetectMonorepoDisabled, false)
  t.equal(options.tagPrefix, 'my-package@')
  t.ok(options.stripTagPrefix)
})

test('getOptions: --autodetect-monorepo-disabled still disables autodetection', async t => {
  const readJson = file => (file === 'package.json'
    ? { name: 'my-package', repository: { directory: 'packages/my-package' }, 'auto-changelog': { autodetectMonorepoDisabled: false } }
    : null)
  const options = await getOptions(['', '', '--autodetect-monorepo-disabled'], { readJson })
  t.equal(options.autodetectMonorepoDisabled, true)
  t.equal(options.tagPrefix, '')
  t.notOk(options.stripTagPrefix)
})

test('getOptions: neither flag leaves in-repo config in charge', async t => {
  const readJson = file => (file === 'package.json'
    ? { name: 'my-package', repository: { directory: 'packages/my-package' }, 'auto-changelog': { autodetectMonorepoDisabled: false } }
    : null)
  const options = await getOptions(['', ''], { readJson })
  t.equal(options.autodetectMonorepoDisabled, false)
  t.equal(options.tagPrefix, 'my-package@')
})

test('run: generates a changelog', async t => {
  const expected = await readFile(join(__dirname, 'data', 'template-compact.md'))

  await run(['', ''], {
    ...deps,
    writeFile: (output, log) => {
      t.equal(output, 'CHANGELOG.md')
      t.equal(log, expected)
    }
  })
})

test.skip('run: generates a changelog with no remote', async t => {
  const expected = await readFile(join(__dirname, 'data', 'template-compact-no-remote.md'))

  await run(['', ''], {
    ...deps,
    fetchRemote: () => remotes.null,
    fetchCommits: () => require('./data/commits-no-remote'),
    writeFile: (output, log) => {
      t.equal(output, 'CHANGELOG.md')
      t.equal(log, expected)
    }
  })
})

test('run: uses options from package.json', async t => {
  const expected = await readFile(join(__dirname, 'data', 'template-keepachangelog.md'))

  await run(['', ''], {
    ...deps,
    fileExists: () => true,
    readJson: () => ({
      'auto-changelog': {
        template: 'keepachangelog'
      }
    }),
    writeFile: (output, log) => {
      t.equal(output, 'CHANGELOG.md')
      t.equal(log, expected)
    }
  })
})

test.skip('run: uses version from package.json', async t => {
  await run(['', '', '--package'], {
    ...deps,
    fileExists: () => true,
    readJson: () => ({
      version: '2.0.0'
    }),
    writeFile: (output, log) => {
      t.ok(log.includes('v2.0.0'))
    }
  })
})

test.skip('run: uses version from custom package file', async t => {
  await run(['', '', '--package', 'test.json'], {
    ...deps,
    fileExists: () => true,
    readJson: file => {
      if (file === 'test.json') {
        return { version: '2.0.0' }
      }
      return {}
    },
    writeFile: (output, log) => {
      t.ok(log.includes('v2.0.0'))
    }
  })
})

test.skip('run: uses version from package.json with no prefix', async t => {
  await run(['', '', '--package'], {
    ...deps,
    fileExists: () => true,
    readJson: () => ({
      version: '2.0.0'
    }),
    fetchTags: () => Promise.resolve(tags.map(tag => tag.replace('v', ''))),
    writeFile: (output, log) => {
      t.ok(log.includes('2.0.0'))
      t.ok(!log.includes('v2.0.0'))
    }
  })
})

test('run: command line options override options from package.json', async t => {
  await run(['', '', '--output', 'should-be-this.md'], {
    ...deps,
    fileExists: path => path === '.auto-changelog',
    readJson: () => ({
      'auto-changelog': {
        output: 'should-not-be-this.md'
      }
    }),
    writeFile: (output, log) => {
      t.equal(output, 'should-be-this.md')
    }
  })
})

test('run: uses options from .auto-changelog', async t => {
  const expected = await readFile(join(__dirname, 'data', 'template-keepachangelog.md'))

  await run(['', ''], {
    ...deps,
    fileExists: path => path === '.auto-changelog',
    readJson: path => {
      return path === '.auto-changelog' ? { template: 'keepachangelog' } : null
    },
    writeFile: (output, log) => {
      t.equal(log, expected)
    }
  })
})

test('run: command line options override options from .auto-changelog', async t => {
  await run(['', '', '--output', 'should-be-this.md'], {
    ...deps,
    fileExists: path => path === '.auto-changelog',
    readJson: path => {
      return path === '.auto-changelog' ? { output: 'should-not-be-this.md' } : null
    },
    writeFile: (output, log) => {
      t.equal(output, 'should-be-this.md')
    }
  })
})

const rejectsConfig = (label, config, fromPackage = false) => {
  test(`getOptions: refuses to run when in-repo config ${label}`, t => {
    const value = fromPackage ? { 'auto-changelog': config } : config
    const readJson = file => ((fromPackage ? file === 'package.json' : file === '.auto-changelog') ? value : null)
    return getOptions(['', ''], { readJson })
      .then(() => t.fail('should refuse to run'))
      .catch(() => t.pass('refused'))
  })
}

rejectsConfig('sets handlebarsSetup', { handlebarsSetup: 'evil.js' }, true)
rejectsConfig('sets plugins', { plugins: ['evil'] })
rejectsConfig('sets a URL template', { template: 'http://attacker.example/evil.hbs' })
rejectsConfig('sets an argument-injecting remote', { remote: 'origin --output=/tmp/pwned' })
rejectsConfig('sets a traversing output path', { output: '../../.git/hooks/pre-commit' })
rejectsConfig('sets an absolute output path', { output: '/tmp/pwned.md' })
rejectsConfig('sets an appendGitLog with --output', { appendGitLog: '--output=../pwned' })
rejectsConfig('sets an appendGitTag with --output', { appendGitTag: '--first-parent --output ../pwned' })

test('getOptions: keeps a non-URL template from in-repo config', async t => {
  const readJson = file => (file === '.auto-changelog'
    ? { template: 'keepachangelog' }
    : null)
  const options = await getOptions(['', ''], { readJson })
  t.equal(options.template, 'keepachangelog')
})

test('getOptions: keeps a normal remote from in-repo config', async t => {
  const readJson = file => (file === '.auto-changelog'
    ? { remote: 'upstream' }
    : null)
  const options = await getOptions(['', ''], { readJson })
  t.equal(options.remote, 'upstream')
})

test('getOptions: keeps an in-repo output path from in-repo config', async t => {
  const readJson = file => (file === '.auto-changelog'
    ? { output: 'docs/HISTORY.md' }
    : null)
  const options = await getOptions(['', ''], { readJson })
  t.equal(options.output, 'docs/HISTORY.md')
})

test('getOptions: honors a safe appendGitLog and appendGitTag from in-repo config', async t => {
  const readJson = file => (file === '.auto-changelog'
    ? { appendGitLog: '--first-parent', appendGitTag: '--sort=-creatordate' }
    : null)
  const options = await getOptions(['', ''], { readJson })
  t.equal(options.appendGitLog, '--first-parent')
  t.equal(options.appendGitTag, '--sort=-creatordate')
})

test('getOptions: honors handlebarsSetup from the command line', async t => {
  const options = await getOptions(['', '', '--handlebars-setup', 'setup.js'])
  t.equal(options.handlebarsSetup, 'setup.js')
})

test('getOptions: honors a URL template from the command line', async t => {
  const options = await getOptions(['', '', '--template', 'http://example.local/template.hbs'])
  t.equal(options.template, 'http://example.local/template.hbs')
})

test('getOptions: --unsafe-config honors unsafe options from in-repo config', async t => {
  const readJson = file => (file === 'package.json'
    ? { 'auto-changelog': { handlebarsSetup: 'setup.js', appendGitLog: '--output=anywhere' } }
    : null)
  const options = await getOptions(['', '', '--unsafe-config'], { readJson })
  t.equal(options.handlebarsSetup, 'setup.js')
  t.equal(options.appendGitLog, '--output=anywhere')
})

test('getOptions: honors plugins from the command line', async t => {
  const options = await getOptions(['', '', '--plugins', 'foo'], { importCwd: name => name })
  t.deepEqual(options.plugins, ['auto-changelog-foo'])
})

test('getOptions: throws a useful error for --plugins with no names', async t => {
  try {
    await getOptions(['', '', '--plugins'], { importCwd: name => name })
    t.fail('should throw')
  } catch (error) {
    t.match(error.message, /--plugins requires at least one plugin name/)
  }
})

test.skip('run: supports unreleased option', async t => {
  await run(['', '', '--unreleased'], {
    ...deps,
    writeFile: (output, log) => {
      t.ok(log.includes('Unreleased'))
      t.ok(log.includes('https://github.com/user/repo/compare/v1.0.0...HEAD'))
    }
  })
})

test.skip('run: supports breakingPattern option', async t => {
  const { commitsMap } = require('./data/commits-map')
  const addBreakingFlag = commit => {
    if (/Some breaking change/.test(commit.message)) {
      return { ...commit, breaking: true }
    }
    return commit
  }
  // No need to actually pass in the option here as we amend the commits
  await run(['', '', '--commit-limit', '0'], {
    ...deps,
    fetchCommits: diff => Promise.resolve(commitsMap[diff].map(addBreakingFlag)),
    writeFile: (output, log) => {
      t.ok(log.includes('**Breaking change:** Some breaking change'))
    }
  })
})

test.skip('run: supports releaseSummary option', async t => {
  await run(['', '', '--release-summary'], {
    ...deps,
    writeFile: (output, log) => {
      t.ok(log.includes('This is my major release description.\n\n- And a bullet point'))
    }
  })
})

test('run: does not error when using latest version option', async t => {
  await run(['', '', '--latest-version', 'v3.0.0'], deps)
  t.pass('did not error')
})

// For some reason is preventing the fetchTags test from running…?`
test.skip('run: does not error when using stdout option', async t => {
  await run(['', '', '--stdout'], deps)
  t.pass('did not error')
})

test('run: throws an error when no package found', t => {
  return run(['', '', '--package'], deps)
    .then(() => t.fail('Should throw an error'))
    .catch(() => t.pass('threw'))
})

test('run: throws an error when no custom package found', t => {
  return run(['', '', '--package', 'does-not-exist.json'], deps)
    .then(() => t.fail('Should throw an error'))
    .catch(() => t.pass('threw'))
})

test('run: throws an error when no template found', t => {
  return run(['', '', '--template', 'not-found'], deps)
    .then(() => t.fail('Should throw an error'))
    .catch(() => t.pass('threw'))
})
