'use strict';

const test = require('tape');
const { join } = require('path');
const {
	mkdtempSync,
	realpathSync,
	rmSync,
} = require('fs');
const { tmpdir } = require('os');
const { execFileSync } = require('child_process');
const { readFile } = require('../src/utils');
const remotes = require('./data/remotes');
const commits = require('./data/commits');
const commitsNoRemote = require('./data/commits-no-remote');
const { fetchCommits } = require('../src/commits');
const {
	COMMIT_SEPARATOR,
	MESSAGE_SEPARATOR,
	parseCommits,
	getFixes,
	getMerge,
	getSubject,
} = require('../src/parse-commits');
const { captureStderr } = require('./utils/stderr');

test('fetchCommits: fetches commits', async (t) => {
	const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'));
	t.deepEqual(await fetchCommits('', remotes.github, { cmd: () => gitLog }), commits);
});

test('fetchCommits: reads parent hashes from a real git log', async (t) => {
	const original = process.cwd();
	const repo = realpathSync(mkdtempSync(join(tmpdir(), 'auto-changelog-')));
	function git(...args) {
		return execFileSync('git', [
			'-c',
			'user.name=Example Author',
			'-c',
			'user.email=email@example.com',
			'-c',
			'commit.gpgsign=false',
			...args,
		], { cwd: repo }).toString().trim();
	}
	try {
		git('init', '-q');
		git('commit', '-q', '--allow-empty', '-m', 'Root commit');
		git('checkout', '-q', '-b', 'branch');
		git('commit', '-q', '--allow-empty', '-m', 'Branch commit');
		git('checkout', '-q', '-');
		git('commit', '-q', '--allow-empty', '-m', 'Mainline commit');
		git('merge', '-q', '--no-ff', 'branch', '-m', 'Merge pull request #1 from user/branch', '-m', 'Pull request title');
		const [merge, first, second] = git('rev-list', '--parents', '-n', '1', 'HEAD').split(' ');
		const [root] = git('rev-list', '--max-parents=0', 'HEAD').split('\n');
		process.chdir(repo);
		const fetched = await fetchCommits('HEAD', { ...remotes.github, appendGitLog: '' });
		const byHash = new Map(fetched.map((commit) => [commit.hash, commit]));
		t.equal(fetched.length, 4, 'every commit is parsed');
		t.deepEqual(byHash.get(merge).parents, [first, second], 'a merge commit has both parents');
		t.equal(byHash.get(merge).merge.message, 'Pull request title', 'the rest of the format is still parsed');
		t.deepEqual(byHash.get(first).parents, [root], 'a commit has its parent');
		t.deepEqual(byHash.get(root).parents, [], 'a root commit has no parents');
	} finally {
		process.chdir(original);
		rmSync(repo, { recursive: true, force: true });
	}
});

test('parseCommits: parses commits', async (t) => {
	const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'));
	t.deepEqual(parseCommits(gitLog, remotes.github), commits);
});

test('parseCommits: parses commits without remote', async (t) => {
	const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'));
	t.deepEqual(parseCommits(gitLog, remotes.null), commitsNoRemote);
});

test('parseCommits: parses bitbucket commits', async (t) => {
	const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'));
	const parsedCommits = parseCommits(gitLog, remotes.bitbucket);
	t.equal(parsedCommits[0].href, 'https://bitbucket.org/user/repo/commits/2401ee4706e94629f48830bab9ed5812c032734a');
});

test('parseCommits: supports breakingPattern option', async (t) => {
	const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'));
	const options = {
		breakingPattern: 'Some breaking change',
		...remotes.github,
	};
	const result = parseCommits(gitLog, options);
	t.equal(result.filter((c) => c.breaking).length, 1);
});

test('parseCommits: supports replaceText option', async (t) => {
	const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'));
	const options = {
		replaceText: {
			breaking: '**BREAKING**',
		},
		...remotes.github,
	};
	const result = parseCommits(gitLog, options);
	t.equal(result.filter((c) => c.subject === 'Some **BREAKING** change').length, 1);
});

test('parseCommits: applies replaceText to the whole message', async (t) => {
	const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'));
	const options = {
		replaceText: {
			'extra notes': '**extra notes**',
		},
		...remotes.github,
	};
	const result = parseCommits(gitLog, options);
	t.deepEqual(
		result.filter((c) => c.message.includes('**extra notes**')).map((c) => c.message),
		['Commit 4 fixes #4 in the subject\n\nWith some **extra notes** here'],
	);
});

test('parseCommits: supports commitPattern option', async (t) => {
	const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'));
	const options = {
		commitPattern: 'First',
		...remotes.github,
	};
	const result = parseCommits(gitLog, options);
	t.equal(result.length, 1);
});

test('parseCommits: supports ignoreCommitPattern option', async (t) => {
	const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'));
	const all = parseCommits(gitLog, remotes.github).map((c) => c.subject);
	const result = parseCommits(gitLog, { ignoreCommitPattern: '^Second', ...remotes.github }).map((c) => c.subject);
	t.deepEqual(result, all.filter((subject) => subject !== 'Second commit'), 'drops only the commit whose subject matches');
});

test('parseCommits: ignoreCommitPattern also matches a merged pull request\'s title', async (t) => {
	const gitLog = await readFile(join(__dirname, 'data', 'git-log.txt'));
	const result = parseCommits(gitLog, { ignoreCommitPattern: '^Should not parse', ...remotes.github });
	t.deepEqual(
		result.filter((c) => c.merge).map((c) => c.merge.id),
		['3'],
		'drops PR #5, whose title matches, but not PR #3',
	);
});

test('getFixes: returns null with no fixes', (t) => {
	const message = 'Commit message with no fixes';
	t.equal(getFixes(message, 'Commit Author', remotes.github), null);
	t.end();
});

test('getFixes: parses a single fix', (t) => {
	const message = 'Commit that fixes #12';
	t.deepEqual(getFixes(message, 'Commit Author', remotes.github), [
		{ id: '12', href: 'https://github.com/user/repo/issues/12', author: 'Commit Author' },
	]);
	t.end();
});

test('getFixes: parses fix in commit notes', (t) => {
	const message = 'Commit message\n\nCloses #8';
	t.deepEqual(getFixes(message, 'Commit Author', remotes.github), [
		{ id: '8', href: 'https://github.com/user/repo/issues/8', author: 'Commit Author' },
	]);
	t.end();
});

test('getFixes: parses a commit that closes a pull request', (t) => {
	const message = 'Commit message\n\nCloses https://github.com/user/repo/pull/14';
	t.deepEqual(getFixes(message, 'Commit Author', remotes.github), [
		{ id: '14', href: 'https://github.com/user/repo/pull/14', author: 'Commit Author' },
	]);
	t.end();
});

test('getFixes: spells a full link to the repository\'s own issue or pull request like the remote does', (t) => {
	const message = 'Fixes https://github.com/USER/Repo/issues/5, fixes https://GitHub.com/User/Repo/pull/6, fixes https://github.com/other/repo/issues/7';
	t.deepEqual(getFixes(message, 'Commit Author', remotes.github), [
		{ id: '5', href: 'https://github.com/user/repo/issues/5', author: 'Commit Author' },
		{ id: '6', href: 'https://github.com/user/repo/pull/6', author: 'Commit Author' },
		{ id: '7', href: 'https://github.com/other/repo/issues/7', author: 'Commit Author' },
	]);
	const noMergeLink = { getIssueLink: remotes.github.getIssueLink };
	t.deepEqual(getFixes('Fixes https://github.com/User/Repo/pull/6', 'Commit Author', noMergeLink), [
		{ id: '6', href: 'https://github.com/User/Repo/pull/6', author: 'Commit Author' },
	], 'without a merge link, a pull request link is kept as written');
	t.deepEqual(getFixes('Fixes https://github.com/User/Repo/issues/5', 'Commit Author', remotes.null), [
		{ id: '5', href: 'https://github.com/User/Repo/issues/5', author: 'Commit Author' },
	], 'without a remote, as written');
	t.end();
});

test('getFixes: parses multiple fixes', (t) => {
	const message = 'Commit message\n\nFixes #1, fix #2, resolved #3, closes #4';
	t.deepEqual(getFixes(message, 'Commit Author', remotes.github), [
		{ id: '1', href: 'https://github.com/user/repo/issues/1', author: 'Commit Author' },
		{ id: '2', href: 'https://github.com/user/repo/issues/2', author: 'Commit Author' },
		{ id: '3', href: 'https://github.com/user/repo/issues/3', author: 'Commit Author' },
		{ id: '4', href: 'https://github.com/user/repo/issues/4', author: 'Commit Author' },
	]);
	t.end();
});

test('getFixes: parses fixes by issue URL', (t) => {
	const message = 'Commit message\n\nFixes https://github.com/user/repo/issues/1';
	t.deepEqual(getFixes(message, 'Commit Author', remotes.github), [
		{ id: '1', href: 'https://github.com/user/repo/issues/1', author: 'Commit Author' },
	]);
	t.end();
});

test('getFixes: parses multiple fixes by issue URL', (t) => {
	const message = 'Commit message\n\nFixes https://github.com/user/repo/issues/1 and fixes https://github.com/user/repo/issues/2';
	t.deepEqual(getFixes(message, 'Commit Author', remotes.github), [
		{ id: '1', href: 'https://github.com/user/repo/issues/1', author: 'Commit Author' },
		{ id: '2', href: 'https://github.com/user/repo/issues/2', author: 'Commit Author' },
	]);
	t.end();
});

test('getFixes: parses external repo issues', (t) => {
	const message = 'Commit message\n\nFixes https://github.com/other-user/external-repo/issues/1';
	t.deepEqual(getFixes(message, 'Commit Author', remotes.github), [
		{ id: '1', href: 'https://github.com/other-user/external-repo/issues/1', author: 'Commit Author' },
	]);
	t.end();
});

test('getFixes: parses azure devops fix', (t) => {
	const message = 'Commit message\n\nCloses #123';
	t.deepEqual(getFixes(message, 'Commit Author', remotes.azure), [
		{ id: '123', href: 'https://dev.azure.com/user/project/_workitems/edit/123', author: 'Commit Author' },
	]);
	t.end();
});

test('getFixes: parses visual studio fix', (t) => {
	const message = 'Commit message\n\nCloses #123';
	t.deepEqual(getFixes(message, 'Commit Author', remotes.visualstudio), [
		{ id: '123', href: 'https://user.visualstudio.com/project/_workitems/edit/123', author: 'Commit Author' },
	]);
	t.end();
});

test('getFixes: supports issuePattern parameter', (t) => {
	const options = {
		issuePattern: '[A-Z]+-\\d+',
		...remotes.github,
	};
	const message = 'Commit message\n\nCloses ABC-1234';
	t.deepEqual(getFixes(message, 'Commit Author', options), [
		{ id: 'ABC-1234', href: 'https://github.com/user/repo/issues/ABC-1234', author: 'Commit Author' },
	]);
	t.end();
});

test('getFixes: supports issuePattern parameter with capture group', (t) => {
	const options = {
		issuePattern: '[Ff]ixes ([A-Z]+-\\d+)',
		...remotes.github,
	};
	const message = 'Commit message\n\nFixes ABC-1234 and fixes ABC-2345 but not BCD-2345';
	t.deepEqual(getFixes(message, 'Commit Author', options), [
		{ id: 'ABC-1234', href: 'https://github.com/user/repo/issues/ABC-1234', author: 'Commit Author' },
		{ id: 'ABC-2345', href: 'https://github.com/user/repo/issues/ABC-2345', author: 'Commit Author' },
	]);
	t.end();
});

test('getFixes: lists each fixed issue once', (t) => {
	const options = {
		issuePattern: '[A-Z]+-\\d+',
		...remotes.github,
	};
	const message = 'ABC-1111 Added vital changes\n\nABC-1111 ABC-2222 ABC-1111';
	t.deepEqual(getFixes(message, 'Commit Author', options), [
		{ id: 'ABC-1111', href: 'https://github.com/user/repo/issues/ABC-1111', author: 'Commit Author' },
		{ id: 'ABC-2222', href: 'https://github.com/user/repo/issues/ABC-2222', author: 'Commit Author' },
	]);
	t.end();
});

test('getFixes: keeps the same issue number in different repos', (t) => {
	const message = 'Fixes #1 and fixes https://github.com/other/repo/issues/1 and fixes #1';
	t.deepEqual(getFixes(message, 'Commit Author', remotes.github), [
		{ id: '1', href: 'https://github.com/user/repo/issues/1', author: 'Commit Author' },
		{ id: '1', href: 'https://github.com/other/repo/issues/1', author: 'Commit Author' },
	]);
	t.end();
});

const EXAMPLE_COMMIT = {
	author: 'Commit Author',
	id: 123,
};

test('getMerge: returns null on fail', (t) => {
	const message = 'Not a merge commit';
	t.equal(getMerge(EXAMPLE_COMMIT, message, remotes.github), null);
	t.end();
});

test('getMerge github: parses a merge', (t) => {
	const message = 'Merge pull request #3 from repo/branch\n\nPull request title';
	t.deepEqual(getMerge(EXAMPLE_COMMIT, message, remotes.github), {
		id: '3',
		message: 'Pull request title',
		href: 'https://github.com/user/repo/pull/3',
		author: 'Commit Author',
		commit: EXAMPLE_COMMIT,
	});
	t.end();
});

test('getMerge github: parses a squash merge', (t) => {
	const message = 'Update dependencies to enable Greenkeeper 🌴 (#10)\n\n* chore(package): update dependencies';
	t.deepEqual(getMerge(EXAMPLE_COMMIT, message, remotes.github), {
		id: '10',
		message: 'Update dependencies to enable Greenkeeper 🌴',
		href: 'https://github.com/user/repo/pull/10',
		author: 'Commit Author',
		commit: EXAMPLE_COMMIT,
	});
	t.end();
});

test('getMerge github: parses a squash merge with no message', (t) => {
	const message = 'Generate changelogs that show the commits between tags (#411)';
	t.deepEqual(getMerge(EXAMPLE_COMMIT, message, remotes.github), {
		id: '411',
		message: 'Generate changelogs that show the commits between tags',
		href: 'https://github.com/user/repo/pull/411',
		author: 'Commit Author',
		commit: EXAMPLE_COMMIT,
	});
	t.end();
});

test('getMerge github: parses a squash merge with no message and a trailing newline', (t) => {
	const message = 'Generate changelogs that show the commits between tags (#411)\n';
	t.deepEqual(getMerge(EXAMPLE_COMMIT, message, remotes.github), {
		id: '411',
		message: 'Generate changelogs that show the commits between tags',
		href: 'https://github.com/user/repo/pull/411',
		author: 'Commit Author',
		commit: EXAMPLE_COMMIT,
	});
	t.end();
});

test('parseCommits: parses a squash merge with no message', (t) => {
	const gitLog = `${COMMIT_SEPARATOR}2401ee4706e94629f48830bab9ed5812c032734a
2015-12-29 21:57:19 +0000
Commit Author
commit@author.com
Generate changelogs that show the commits between tags (#411)
${MESSAGE_SEPARATOR}
 1 file changed, 1 insertion(+)
`;
	const [commit] = parseCommits(gitLog, remotes.github);
	t.equal(commit.merge && commit.merge.id, '411', 'is parsed as a merge');
	t.end();
});

test('parseCommits: parses parent hashes', (t) => {
	const gitLog = `${COMMIT_SEPARATOR}0e24bf427a51eac52133cc731b4b5d74a7e04672 92839699a6aaea148dcd72ea897321e66cae0c18 17fbef87e82889f01d8257900f7edc55b05918a2
2015-12-24 20:29:22 +0000
Commit Author
commit@author.com
Merge pull request #5 from repo/branch

Pull request title
${MESSAGE_SEPARATOR}
${COMMIT_SEPARATOR}92839699a6aaea148dcd72ea897321e66cae0c18 158fdde54b6188c9f9ca3034e9cb5bcc3fe3ff69
2015-12-24 20:28:22 +0000
Commit Author
commit@author.com
Second commit
${MESSAGE_SEPARATOR}
 1 file changed, 1 insertion(+)

${COMMIT_SEPARATOR}158fdde54b6188c9f9ca3034e9cb5bcc3fe3ff69${' '}
2015-12-24 20:27:22 +0000
Commit Author
commit@author.com
Root commit
${MESSAGE_SEPARATOR}
 1 file changed, 1 insertion(+)
`;
	const [merge, commit, root] = parseCommits(gitLog, remotes.github);
	t.equal(merge.hash, '0e24bf427a51eac52133cc731b4b5d74a7e04672', 'merge commit hash');
	t.deepEqual(merge.parents, ['92839699a6aaea148dcd72ea897321e66cae0c18', '17fbef87e82889f01d8257900f7edc55b05918a2'], 'merge commit parents');
	t.deepEqual(merge.merge.commit.parents, merge.parents, 'the merge carries its commit\'s parents');
	t.equal(commit.hash, '92839699a6aaea148dcd72ea897321e66cae0c18', 'commit hash');
	t.deepEqual(commit.parents, ['158fdde54b6188c9f9ca3034e9cb5bcc3fe3ff69'], 'commit parent');
	t.equal(root.hash, '158fdde54b6188c9f9ca3034e9cb5bcc3fe3ff69', 'root commit hash');
	t.deepEqual(root.parents, [], 'root commit has no parents');
	t.end();
});

test('getMerge gitlab: parses a merge', (t) => {
	const message = 'Merge branch \'branch\' into \'master\'\n\nMemoize GitLab logger to reduce open file descriptors\n\nCloses gitlab-ee#3664\n\nSee merge request !15007';
	t.deepEqual(getMerge(EXAMPLE_COMMIT, message, remotes.gitlab), {
		id: '15007',
		message: 'Memoize GitLab logger to reduce open file descriptors',
		href: 'https://gitlab.com/user/repo/merge_requests/15007',
		author: 'Commit Author',
		commit: EXAMPLE_COMMIT,
	});
	t.end();
});

test('getMerge gitlab: parses a merge for subgroups', (t) => {
	const message = 'Merge branch \'branch\' into \'master\'\n\nMemoize GitLab logger to reduce open file descriptors\n\nCloses gitlab-ee#3664\n\nSee merge request user/repo/subgroup!15007';
	t.deepEqual(getMerge(EXAMPLE_COMMIT, message, remotes.gitlabSubgroup), {
		id: '15007',
		message: 'Memoize GitLab logger to reduce open file descriptors',
		href: 'https://gitlab.com/user/repo/subgroup/merge_requests/15007',
		author: 'Commit Author',
		commit: EXAMPLE_COMMIT,
	});
	t.end();
});

test('getMerge bitbucket: parses a merge', (t) => {
	const message = 'Merged in eshvedai/fix-schema-issue (pull request #4518)\n\nfix(component): re-export createSchema from editor-core\n\nApproved-by: Scott Sidwell <ssidwell@atlassian.com>';
	t.deepEqual(getMerge(EXAMPLE_COMMIT, message, remotes.bitbucket), {
		id: '4518',
		message: 'fix(component): re-export createSchema from editor-core',
		href: 'https://bitbucket.org/user/repo/pull-requests/4518',
		author: 'Commit Author',
		commit: EXAMPLE_COMMIT,
	});
	t.end();
});

test('getMerge azure devops: parses a merge', (t) => {
	// Use github merge message until we can find out what an azure devops one looks like
	const message = 'Merge pull request #3 from repo/branch\n\nPull request title';
	t.deepEqual(getMerge(EXAMPLE_COMMIT, message, remotes.azure), {
		id: '3',
		message: 'Pull request title',
		href: 'https://dev.azure.com/user/project/_git/repo/pullrequest/3',
		author: 'Commit Author',
		commit: EXAMPLE_COMMIT,
	});
	t.end();
});

test('getMerge visual studio: parses a merge', (t) => {
	// Use github merge message until we can find out what a visual studio one looks like
	const message = 'Merge pull request #3 from repo/branch\n\nPull request title';
	t.deepEqual(getMerge(EXAMPLE_COMMIT, message, remotes.visualstudio), {
		id: '3',
		message: 'Pull request title',
		href: 'https://user.visualstudio.com/project/_git/repo/pullrequest/3',
		author: 'Commit Author',
		commit: EXAMPLE_COMMIT,
	});
	t.end();
});

test('getMerge: supports mergePattern parameter', (t) => {
	const options = {
		mergePattern: 'PR #(\\d+) from .+\\n\\n.+\\n(.+)',
		...remotes.github,
	};

	const message = 'PR #37 from repo/branch\n\ncommit sha512\nPull request title';
	t.deepEqual(getMerge(EXAMPLE_COMMIT, message, options), {
		id: '37',
		message: 'Pull request title',
		href: 'https://github.com/user/repo/pull/37',
		author: 'Commit Author',
		commit: EXAMPLE_COMMIT,
	});
	t.end();
});

test('getMerge: supports replaceText option', (t) => {
	const message = 'Merge pull request #3 from repo/branch\n\nPull request title';
	const options = {
		replaceText: {
			'(..l)': '_$1_',
		},
		...remotes.github,
	};
	t.deepEqual(getMerge(EXAMPLE_COMMIT, message, options), {
		id: '3',
		message: '_Pul_l request t_itl_e',
		href: 'https://github.com/user/repo/pull/3',
		author: 'Commit Author',
		commit: EXAMPLE_COMMIT,
	});
	t.end();
});

test('getSubject: returns commit subject', (t) => {
	const message = ' Commit message\n\nCloses ABC-1234';
	t.equal(getSubject(message), 'Commit message');
	t.end();
});

test('getSubject: returns no commit message', (t) => {
	t.equal(getSubject(''), '_No commit message_');
	t.end();
});

test('fetchCommits: reads whole commit messages with `%B`', async (t) => {
	const commands = [];
	function cmd(command) {
		commands.push(command);
		return Promise.resolve('');
	}
	await fetchCommits('v1.0.0..v2.0.0', { ...remotes.github, appendGitLog: '' }, { cmd });
	t.equal(commands.length, 1);
	t.equal(commands[0].trim(), 'git log v1.0.0..v2.0.0 --shortstat --pretty=format:__AUTO_CHANGELOG_COMMIT_SEPARATOR__%H%x20%P%n%ai%n%an%n%ae%n%B__AUTO_CHANGELOG_MESSAGE_SEPARATOR__');
});

function gitLogOf(commitsToLog) {
	return commitsToLog
		.map(({ hash, subject }) => `${COMMIT_SEPARATOR}${hash}\n2000-01-01 00:00:00 +0000\nAuthor\nemail@example.com\n${subject}\n${MESSAGE_SEPARATOR}\n`)
		.join('');
}

test('fetchCommits: --verbose says which git command it runs', async (t) => {
	const verbose = { ...remotes.github, verbose: true, appendGitLog: '' };
	const { lines } = await captureStderr(t, () => fetchCommits('v1.0.0..v2.0.0', verbose, { cmd: () => Promise.resolve('') }));
	t.equal(lines.length, 1);
	t.match(lines[0], /^running git log v1\.0\.0\.\.v2\.0\.0 --shortstat --pretty=format:__AUTO_CHANGELOG_COMMIT_SEPARATOR__\S+$/);
});

test('parseCommits: --verbose says which commits the commit patterns left out', async (t) => {
	const gitLog = gitLogOf([
		{ hash: 'a'.repeat(40), subject: 'feat: kept' },
		{ hash: 'b'.repeat(40), subject: 'chore: ignored' },
		{ hash: 'c'.repeat(40), subject: 'unmatched' },
	]);
	const options = {
		...remotes.github,
		verbose: true,
		commitPattern: ':',
		ignoreCommitPattern: '^chore',
	};
	const { result, lines } = await captureStderr(t, () => parseCommits(gitLog, options));
	t.deepEqual(result.map(({ subject }) => subject), ['feat: kept']);
	t.deepEqual(lines, [
		'left out commit bbbbbbb "chore: ignored": it matches `--ignore-commit-pattern`',
		'left out commit ccccccc "unmatched": it does not match `--commit-pattern`',
	]);
});
