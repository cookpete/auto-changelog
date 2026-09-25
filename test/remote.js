const test = require('tape')
const { fetchRemote } = require('../src/remote')

const TEST_DATA = [
  {
    remotes: [
      'http://github.com/user/repo'
    ],
    expected: {
      commit: 'http://github.com/user/repo/commit/123',
      issue: 'http://github.com/user/repo/issues/123',
      merge: 'http://github.com/user/repo/pull/123',
      compare: 'http://github.com/user/repo/compare/v1.2.3...v2.0.0'
    }
  },
  {
    remotes: [
      'https://github.com/user/repo',
      'https://github.com:8080/user/repo',
      'git@github.com:user/repo.git'
    ],
    expected: {
      commit: 'https://github.com/user/repo/commit/123',
      issue: 'https://github.com/user/repo/issues/123',
      merge: 'https://github.com/user/repo/pull/123',
      compare: 'https://github.com/user/repo/compare/v1.2.3...v2.0.0'
    }
  },
  {
    remotes: [
      'https://gitlab.com/user/repo',
      'git@gitlab.com:user/repo.git'
    ],
    expected: {
      commit: 'https://gitlab.com/user/repo/commit/123',
      issue: 'https://gitlab.com/user/repo/issues/123',
      merge: 'https://gitlab.com/user/repo/merge_requests/123',
      compare: 'https://gitlab.com/user/repo/compare/v1.2.3...v2.0.0'
    }
  },
  {
    remotes: [
      'https://gitlab.com/user/repo/subgroup.git',
      'git@gitlab.com:user/repo/subgroup.git'
    ],
    expected: {
      commit: 'https://gitlab.com/user/repo/subgroup/commit/123',
      issue: 'https://gitlab.com/user/repo/subgroup/issues/123',
      merge: 'https://gitlab.com/user/repo/subgroup/merge_requests/123',
      compare: 'https://gitlab.com/user/repo/subgroup/compare/v1.2.3...v2.0.0'
    }
  },
  {
    remotes: [
      'https://gitlab.com/user/repo/group/repo.git',
      'git@gitlab.com:user/repo/group/repo.git'
    ],
    expected: {
      commit: 'https://gitlab.com/user/repo/group/repo/commit/123',
      issue: 'https://gitlab.com/user/repo/group/repo/issues/123',
      merge: 'https://gitlab.com/user/repo/group/repo/merge_requests/123',
      compare: 'https://gitlab.com/user/repo/group/repo/compare/v1.2.3...v2.0.0'
    }
  },
  {
    remotes: [
      'https://bitbucket.org/user/repo',
      'git@bitbucket.org:user/repo.git'
    ],
    expected: {
      commit: 'https://bitbucket.org/user/repo/commits/123',
      issue: 'https://bitbucket.org/user/repo/issues/123',
      merge: 'https://bitbucket.org/user/repo/pull-requests/123',
      compare: 'https://bitbucket.org/user/repo/compare/v2.0.0..v1.2.3'
    }
  },
  {
    remotes: [
      'https://dev.azure.com/user/project/_git/repo'
    ],
    expected: {
      commit: 'https://dev.azure.com/user/project/_git/repo/commit/123',
      issue: 'https://dev.azure.com/user/project/_workitems/edit/123',
      merge: 'https://dev.azure.com/user/project/_git/repo/pullrequest/123',
      compare: 'https://dev.azure.com/user/project/_git/repo/branches?baseVersion=GTv1.2.3&targetVersion=GTv2.0.0&_a=commits'
    }
  },
  {
    remotes: [
      'https://user.visualstudio.com/project/_git/repo'
    ],
    expected: {
      commit: 'https://user.visualstudio.com/project/_git/repo/commit/123',
      issue: 'https://user.visualstudio.com/project/_workitems/edit/123',
      merge: 'https://user.visualstudio.com/project/_git/repo/pullrequest/123',
      compare: 'https://user.visualstudio.com/project/_git/repo/branches?baseVersion=GTv1.2.3&targetVersion=GTv2.0.0&_a=commits'
    }
  }
]

for (const { remotes, expected } of TEST_DATA) {
  for (const remote of remotes) {
    test(`fetchRemote: parses ${remote}`, async t => {
      // `git config --get` emits a trailing newline; mirror that here.
      const result = await fetchRemote({}, { cmd: () => `${remote}\n` })
      t.equal(result.getCommitLink('123'), expected.commit)
      t.equal(result.getIssueLink('123'), expected.issue)
      t.equal(result.getMergeLink('123'), expected.merge)
      t.equal(result.getCompareLink('v1.2.3', 'v2.0.0'), expected.compare)
    })
  }
}

test('fetchRemote: supports overrides', async t => {
  const result = await fetchRemote({
    commitUrl: 'https://example.com/commit/{id}',
    issueUrl: 'https://example.com/issue/{id}',
    mergeUrl: 'https://example.com/merge/{id}',
    compareUrl: 'https://example.com/compare/{from}-{to}'
  }, { cmd: () => '' })
  t.equal(result.getCommitLink('123'), 'https://example.com/commit/123')
  t.equal(result.getIssueLink('123'), 'https://example.com/issue/123')
  t.equal(result.getMergeLink('123'), 'https://example.com/merge/123')
  t.equal(result.getCompareLink('v1.2.3', 'v2.0.0'), 'https://example.com/compare/v1.2.3-v2.0.0')
})

test('fetchRemote: returns null functions', async t => {
  const result = await fetchRemote({}, { cmd: () => '' })
  t.equal(result.getCommitLink('123'), null)
  t.equal(result.getIssueLink('123'), null)
  t.equal(result.getMergeLink('123'), null)
  t.equal(result.getCompareLink('v1.2.3', 'v2.0.0'), null)
})
