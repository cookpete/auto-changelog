export default [{
  commits: [],
  fixes: [{
    fixes: ['#6'],
    commit: {
      hash: 'b0b304049847d9568585bc11399fa6cfa4cab5dc',
      tag: null,
      author: 'Pete Cook',
      email: 'email@example.com',
      date: '2015-12-28T21:57:19+00:00',
      subject: 'Unreleased commit',
      message: 'Unreleased commit\n\nFixes #6',
      files: 5,
      insertions: 10,
      deletions: 10
    }
  }],
  merges: []
}, {
  commits: [],
  fixes: [{
    fixes: ['#4'],
    commit: {
      hash: '17fbef87e82889f01d8257900f7edc55b05918a2',
      tag: null,
      author: 'Pete Cook',
      email: 'email@example.com',
      date: '2015-12-28T11:35:54+00:00',
      subject: 'Commit 4 fixes #4 in the subject',
      message: 'Commit 4 fixes #4 in the subject\n\nWith some extra notes here',
      files: 1,
      insertions: 1,
      deletions: 0
    }
  }],
  merges: [{
    pr: '#5',
    message: 'Should not parse #4 in PR title'
  }],
  tag: 'v0.0.2',
  date: '2015-12-28T21:17:17+00:00'
}, {
  commits: [{
    hash: '158fdde54b6188c9f9ca3034e9cb5bcc3fe3ff69',
    tag: null,
    author: 'Pete Cook',
    email: 'email@example.com',
    date: '2015-12-14T17:06:12+00:00',
    subject: 'First commit',
    message: 'First commit',
    files: 7,
    insertions: 37,
    deletions: 22
  }],
  fixes: [{
    fixes: ['#1', 'https://github.com/user/repo/issues/2'],
    commit: {
      hash: '90ef33485369fc7892d11b2e4da04ffb64df1e99',
      tag: null,
      author: 'Pete Cook',
      email: 'email@example.com',
      date: '2015-12-15T11:31:06+00:00',
      subject: 'Second commit',
      message: 'Second commit\n\nResolves #1 and fixes https://github.com/user/repo/issues/2',
      files: 8,
      insertions: 57,
      deletions: 53
    }
  }],
  merges: [{
    pr: '#3',
    message: 'Pull request title'
  }],
  tag: 'v0.0.1',
  date: '2015-12-15T12:03:09+00:00'
}]
