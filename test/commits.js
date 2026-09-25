const test = require('tape')
const { join } = require('path')
const { readFile } = require('../src/utils')
const remotes = require('./data/remotes')
const commits = require('./data/commits')
const commitsNoRemote = require('./data/commits-no-remote')
const { parseCommits, getFixes, getMerge, getSubject } = require('../src/parse-commits')
const {
  fetchCommits,
  __Rewire__: mock,
  __ResetDependency__: unmock
} = require('../src/commits')
const getLogFormat = require('../src/log-format')
const {
  __Rewire__: mockLogFormat,
  __ResetDependency__: unmockLogFormat
} = getLogFormat

test('fetchCommits: fetches commits', async t => {
  const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'))
  mock('cmd', () => gitLog)
  t.deepEqual(await fetchCommits('', remotes.github), commits)
  unmock('cmd')
})

test('parseCommits: parses commits', async t => {
  const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'))
  t.deepEqual(parseCommits(gitLog, remotes.github), commits)
})

test('parseCommits: parses commits without remote', async t => {
  const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'))
  t.deepEqual(parseCommits(gitLog, remotes.null), commitsNoRemote)
})

test('parseCommits: parses bitbucket commits', async t => {
  const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'))
  const commits = parseCommits(gitLog, remotes.bitbucket)
  t.equal(commits[0].href, 'https://bitbucket.org/user/repo/commits/2401ee4706e94629f48830bab9ed5812c032734a')
})

test('parseCommits: supports breakingPattern option', async t => {
  const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'))
  const options = {
    breakingPattern: 'Some breaking change',
    ...remotes.github
  }
  const result = parseCommits(gitLog, options)
  t.equal(result.filter(c => c.breaking).length, 1)
})

test('parseCommits: supports replaceText option', async t => {
  const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'))
  const options = {
    replaceText: {
      breaking: '**BREAKING**'
    },
    ...remotes.github
  }
  const result = parseCommits(gitLog, options)
  t.equal(result.filter(c => c.subject === 'Some **BREAKING** change').length, 1)
})

test('parseCommits: supports commitPattern option', async t => {
  const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'))
  const options = {
    commitPattern: 'First',
    ...remotes.github
  }
  const result = parseCommits(gitLog, options)
  t.equal(result.length, 1)
})

test('getFixes: returns null with no fixes', t => {
  const message = 'Commit message with no fixes'
  t.equal(getFixes(message, 'Commit Author', remotes.github), null)
  t.end()
})

test('getFixes: parses a single fix', t => {
  const message = 'Commit that fixes #12'
  t.deepEqual(getFixes(message, 'Commit Author', remotes.github), [
    { id: '12', href: 'https://github.com/user/repo/issues/12', author: 'Commit Author' }
  ])
  t.end()
})

test('getFixes: parses fix in commit notes', t => {
  const message = 'Commit message\n\nCloses #8'
  t.deepEqual(getFixes(message, 'Commit Author', remotes.github), [
    { id: '8', href: 'https://github.com/user/repo/issues/8', author: 'Commit Author' }
  ])
  t.end()
})

test('getFixes: parses a commit that closes a pull request', t => {
  const message = 'Commit message\n\nCloses https://github.com/user/repo/pull/14'
  t.deepEqual(getFixes(message, 'Commit Author', remotes.github), [
    { id: '14', href: 'https://github.com/user/repo/pull/14', author: 'Commit Author' }
  ])
  t.end()
})

test('getFixes: parses multiple fixes', t => {
  const message = 'Commit message\n\nFixes #1, fix #2, resolved #3, closes #4'
  t.deepEqual(getFixes(message, 'Commit Author', remotes.github), [
    { id: '1', href: 'https://github.com/user/repo/issues/1', author: 'Commit Author' },
    { id: '2', href: 'https://github.com/user/repo/issues/2', author: 'Commit Author' },
    { id: '3', href: 'https://github.com/user/repo/issues/3', author: 'Commit Author' },
    { id: '4', href: 'https://github.com/user/repo/issues/4', author: 'Commit Author' }
  ])
  t.end()
})

test('getFixes: parses fixes by issue URL', t => {
  const message = 'Commit message\n\nFixes https://github.com/user/repo/issues/1'
  t.deepEqual(getFixes(message, 'Commit Author', remotes.github), [
    { id: '1', href: 'https://github.com/user/repo/issues/1', author: 'Commit Author' }
  ])
  t.end()
})

test('getFixes: parses multiple fixes by issue URL', t => {
  const message = 'Commit message\n\nFixes https://github.com/user/repo/issues/1 and fixes https://github.com/user/repo/issues/2'
  t.deepEqual(getFixes(message, 'Commit Author', remotes.github), [
    { id: '1', href: 'https://github.com/user/repo/issues/1', author: 'Commit Author' },
    { id: '2', href: 'https://github.com/user/repo/issues/2', author: 'Commit Author' }
  ])
  t.end()
})

test('getFixes: parses external repo issues', t => {
  const message = 'Commit message\n\nFixes https://github.com/other-user/external-repo/issues/1'
  t.deepEqual(getFixes(message, 'Commit Author', remotes.github), [
    { id: '1', href: 'https://github.com/other-user/external-repo/issues/1', author: 'Commit Author' }
  ])
  t.end()
})

test('getFixes: parses azure devops fix', t => {
  const message = 'Commit message\n\nCloses #123'
  t.deepEqual(getFixes(message, 'Commit Author', remotes.azure), [
    { id: '123', href: 'https://dev.azure.com/user/project/_workitems/edit/123', author: 'Commit Author' }
  ])
  t.end()
})

test('getFixes: parses visual studio fix', t => {
  const message = 'Commit message\n\nCloses #123'
  t.deepEqual(getFixes(message, 'Commit Author', remotes.visualstudio), [
    { id: '123', href: 'https://user.visualstudio.com/project/_workitems/edit/123', author: 'Commit Author' }
  ])
  t.end()
})

test('getFixes: supports issuePattern parameter', t => {
  const options = {
    issuePattern: '[A-Z]+-\\d+',
    ...remotes.github
  }
  const message = 'Commit message\n\nCloses ABC-1234'
  t.deepEqual(getFixes(message, 'Commit Author', options), [
    { id: 'ABC-1234', href: 'https://github.com/user/repo/issues/ABC-1234', author: 'Commit Author' }
  ])
  t.end()
})

test('getFixes: supports issuePattern parameter with capture group', t => {
  const options = {
    issuePattern: '[Ff]ixes ([A-Z]+-\\d+)',
    ...remotes.github
  }
  const message = 'Commit message\n\nFixes ABC-1234 and fixes ABC-2345 but not BCD-2345'
  t.deepEqual(getFixes(message, 'Commit Author', options), [
    { id: 'ABC-1234', href: 'https://github.com/user/repo/issues/ABC-1234', author: 'Commit Author' },
    { id: 'ABC-2345', href: 'https://github.com/user/repo/issues/ABC-2345', author: 'Commit Author' }
  ])
  t.end()
})

const EXAMPLE_COMMIT = {
  author: 'Commit Author',
  id: 123
}

test('getMerge: returns null on fail', t => {
  const message = 'Not a merge commit'
  t.equal(getMerge(EXAMPLE_COMMIT, message, remotes.github), null)
  t.end()
})

test('getMerge github: parses a merge', t => {
  const message = 'Merge pull request #3 from repo/branch\n\nPull request title'
  t.deepEqual(getMerge(EXAMPLE_COMMIT, message, remotes.github), {
    id: '3',
    message: 'Pull request title',
    href: 'https://github.com/user/repo/pull/3',
    author: 'Commit Author',
    commit: EXAMPLE_COMMIT
  })
  t.end()
})

test('getMerge github: parses a squash merge', t => {
  const message = 'Update dependencies to enable Greenkeeper 🌴 (#10)\n\n* chore(package): update dependencies'
  t.deepEqual(getMerge(EXAMPLE_COMMIT, message, remotes.github), {
    id: '10',
    message: 'Update dependencies to enable Greenkeeper 🌴',
    href: 'https://github.com/user/repo/pull/10',
    author: 'Commit Author',
    commit: EXAMPLE_COMMIT
  })
  t.end()
})

test('getMerge github: parses a squash merge with no message', t => {
  const message = 'Generate changelogs that show the commits between tags (#411)'
  t.deepEqual(getMerge(EXAMPLE_COMMIT, message, remotes.github), {
    id: '411',
    message: 'Generate changelogs that show the commits between tags',
    href: 'https://github.com/user/repo/pull/411',
    author: 'Commit Author',
    commit: EXAMPLE_COMMIT
  })
  t.end()
})

test('getMerge gitlab: parses a merge', t => {
  const message = 'Merge branch \'branch\' into \'master\'\n\nMemoize GitLab logger to reduce open file descriptors\n\nCloses gitlab-ee#3664\n\nSee merge request !15007'
  t.deepEqual(getMerge(EXAMPLE_COMMIT, message, remotes.gitlab), {
    id: '15007',
    message: 'Memoize GitLab logger to reduce open file descriptors',
    href: 'https://gitlab.com/user/repo/merge_requests/15007',
    author: 'Commit Author',
    commit: EXAMPLE_COMMIT
  })
  t.end()
})

test('getMerge gitlab: parses a merge for subgroups', t => {
  const message = 'Merge branch \'branch\' into \'master\'\n\nMemoize GitLab logger to reduce open file descriptors\n\nCloses gitlab-ee#3664\n\nSee merge request user/repo/subgroup!15007'
  t.deepEqual(getMerge(EXAMPLE_COMMIT, message, remotes.gitlabSubgroup), {
    id: '15007',
    message: 'Memoize GitLab logger to reduce open file descriptors',
    href: 'https://gitlab.com/user/repo/subgroup/merge_requests/15007',
    author: 'Commit Author',
    commit: EXAMPLE_COMMIT
  })
  t.end()
})

test('getMerge bitbucket: parses a merge', t => {
  const message = 'Merged in eshvedai/fix-schema-issue (pull request #4518)\n\nfix(component): re-export createSchema from editor-core\n\nApproved-by: Scott Sidwell <ssidwell@atlassian.com>'
  t.deepEqual(getMerge(EXAMPLE_COMMIT, message, remotes.bitbucket), {
    id: '4518',
    message: 'fix(component): re-export createSchema from editor-core',
    href: 'https://bitbucket.org/user/repo/pull-requests/4518',
    author: 'Commit Author',
    commit: EXAMPLE_COMMIT
  })
  t.end()
})

test('getMerge azure devops: parses a merge', t => {
  // Use github merge message until we can find out what an azure devops one looks like
  const message = 'Merge pull request #3 from repo/branch\n\nPull request title'
  t.deepEqual(getMerge(EXAMPLE_COMMIT, message, remotes.azure), {
    id: '3',
    message: 'Pull request title',
    href: 'https://dev.azure.com/user/project/_git/repo/pullrequest/3',
    author: 'Commit Author',
    commit: EXAMPLE_COMMIT
  })
  t.end()
})

test('getMerge visual studio: parses a merge', t => {
  // Use github merge message until we can find out what a visual studio one looks like
  const message = 'Merge pull request #3 from repo/branch\n\nPull request title'
  t.deepEqual(getMerge(EXAMPLE_COMMIT, message, remotes.visualstudio), {
    id: '3',
    message: 'Pull request title',
    href: 'https://user.visualstudio.com/project/_git/repo/pullrequest/3',
    author: 'Commit Author',
    commit: EXAMPLE_COMMIT
  })
  t.end()
})

test('getMerge: supports mergePattern parameter', t => {
  const options = {
    mergePattern: 'PR #(\\d+) from .+\\n\\n.+\\n(.+)',
    ...remotes.github
  }

  const message = 'PR #37 from repo/branch\n\ncommit sha512\nPull request title'
  t.deepEqual(getMerge(EXAMPLE_COMMIT, message, options), {
    id: '37',
    message: 'Pull request title',
    href: 'https://github.com/user/repo/pull/37',
    author: 'Commit Author',
    commit: EXAMPLE_COMMIT
  })
  t.end()
})

test('getMerge: supports replaceText option', t => {
  const message = 'Merge pull request #3 from repo/branch\n\nPull request title'
  const options = {
    replaceText: {
      '(..l)': '_$1_'
    },
    ...remotes.github
  }
  t.deepEqual(getMerge(EXAMPLE_COMMIT, message, options), {
    id: '3',
    message: '_Pul_l request t_itl_e',
    href: 'https://github.com/user/repo/pull/3',
    author: 'Commit Author',
    commit: EXAMPLE_COMMIT
  })
  t.end()
})

test('getSubject: returns commit subject', t => {
  const message = ' Commit message\n\nCloses ABC-1234'
  t.equal(getSubject(message), 'Commit message')
  t.end()
})

test('getSubject: returns no commit message', t => {
  t.equal(getSubject(''), '_No commit message_')
  t.end()
})

test('getLogFormat: returns modern format', async t => {
  mockLogFormat('getGitVersion', () => Promise.resolve('1.7.2'))
  t.equal(await getLogFormat(), '__AUTO_CHANGELOG_COMMIT_SEPARATOR__%H%n%ai%n%an%n%ae%n%B__AUTO_CHANGELOG_MESSAGE_SEPARATOR__')
  unmockLogFormat('getGitVersion')
})

test('getLogFormat: returns fallback format', async t => {
  mockLogFormat('getGitVersion', () => Promise.resolve('1.7.1'))
  t.equal(await getLogFormat(), '__AUTO_CHANGELOG_COMMIT_SEPARATOR__%H%n%ai%n%an%n%ae%n%s%n%n%b__AUTO_CHANGELOG_MESSAGE_SEPARATOR__')
  unmockLogFormat('getGitVersion')
})

test('getLogFormat: returns fallback format when null', async t => {
  mockLogFormat('getGitVersion', () => Promise.resolve(null))
  t.equal(await getLogFormat(), '__AUTO_CHANGELOG_COMMIT_SEPARATOR__%H%n%ai%n%an%n%ae%n%s%n%n%b__AUTO_CHANGELOG_MESSAGE_SEPARATOR__')
  unmockLogFormat('getGitVersion')
})
