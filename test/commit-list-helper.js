'use strict';

const test = require('tape');
const Handlebars = require('handlebars');

const commits = [
	{ subject: 'Commit 1', message: 'Commit 1\n\nThis is commit 1, nothing special' },
	{ subject: 'Commit 2', message: 'Commit 2\n\nBREAKING CHANGE: This commit breaks something' },
	{ subject: 'feat: Commit 3', message: 'feat: Commit 3\n\nThis commit adds a feature' },
	{ subject: 'fix: Commit 4', message: 'fix: Commit 4\n\nThis commit adds a fix' },
];

const merges = [
	{ commit: commits[0] },
	{ commit: commits[1] },
	{ commit: commits[2] },
	{ commit: commits[3] },
];

test('commit-list helper: returns nothing with no commits', (t) => {
	const compile = Handlebars.compile([
		'{{#commit-list commits heading="# Heading"}}',
		'- {{subject}}',
		'{{/commit-list}}',
	].join('\n'));
	const expected = '';
	t.equal(compile({ commits: [] }), expected);
	t.end();
});

test('commit-list helper: returns all commits with no options', (t) => {
	const compile = Handlebars.compile([
		'{{#commit-list commits heading="# Heading"}}',
		'- {{subject}}',
		'{{/commit-list}}',
	].join('\n'));
	const expected = [
		'# Heading',
		'',
		'- Commit 1',
		'- Commit 2',
		'- feat: Commit 3',
		'- fix: Commit 4',
		'',
	].join('\n');

	t.equal(compile({ commits }), expected);
	t.end();
});

test('commit-list helper: supports subject pattern matching', (t) => {
	const compile = Handlebars.compile([
		'{{#commit-list commits heading="# Heading" subject="^feat: "}}',
		'- {{subject}}',
		'{{/commit-list}}',
	].join('\n'));
	const expected = [
		'# Heading',
		'',
		'- feat: Commit 3',
		'',
	].join('\n');
	t.equal(compile({ commits }), expected);
	t.end();
});

test('commit-list helper: supports merge subject pattern matching', (t) => {
	const compile = Handlebars.compile([
		'{{#commit-list merges heading="# Heading" subject="^feat: "}}',
		'- {{commit.subject}}',
		'{{/commit-list}}',
	].join('\n'));
	const expected = [
		'# Heading',
		'',
		'- feat: Commit 3',
		'',
	].join('\n');
	t.equal(compile({ merges }), expected);
	t.end();
});

test('commit-list helper: supports commit lists with no heading', (t) => {
	const compile = Handlebars.compile([
		'{{#commit-list merges heading="# Heading" subject="^fix: "}}',
		'- {{commit.subject}}',
		'{{/commit-list}}',
		'{{#commit-list commits subject="^fix: "}}',
		'- {{subject}}',
		'{{/commit-list}}',
		'',
	].join('\n'));
	const expectedMerges = [
		'# Heading',
		'',
		'- fix: Commit 4',
		'',
	].join('\n');
	const expectedCommits = '- fix: Commit 4\n';
	t.equal(compile({ merges }), expectedMerges);
	t.equal(compile({ commits }), expectedCommits);
	t.end();
});

test('commit-list helper: supports message pattern matching', (t) => {
	const compile = Handlebars.compile([
		'{{#commit-list commits heading="# Breaking Changes" message="^BREAKING CHANGE: "}}',
		'- {{subject}}',
		'{{/commit-list}}',
	].join('\n'));
	const expected = [
		'# Breaking Changes',
		'',
		'- Commit 2',
		'',
	].join('\n');
	t.equal(compile({ commits }), expected);
	t.end();
});

test('commit-list helper: supports excludes option', (t) => {
	const compile = Handlebars.compile([
		'{{#commit-list commits heading="# Heading" exclude="^BREAKING CHANGE: "}}',
		'- {{subject}}',
		'{{/commit-list}}',
	].join('\n'));
	const expected = [
		'# Heading',
		'',
		'- Commit 1',
		'- feat: Commit 3',
		'- fix: Commit 4',
		'',
	].join('\n');
	t.equal(compile({ commits }), expected);
	t.end();
});

test('commit-list helper: supports flags for message, subject, and exclude patterns', (t) => {
	function render(hash) {
		return Handlebars.compile(`{{#commit-list commits ${hash}}}- {{subject}}\n{{/commit-list}}`)({ commits });
	}
	t.equal(render('message="^breaking change"'), '', 'case-sensitive by default');
	t.equal(render('message="^breaking change" flags="i"'), '- Commit 2\n', 'message, with `m` still applied');
	t.equal(render('subject="^FEAT: " flags="i"'), '- feat: Commit 3\n', 'subject');
	t.equal(
		render('exclude="^(breaking change|this commit adds)" flags="i"'),
		'- Commit 1\n',
		'exclude, with `m` still applied',
	);
	t.equal(render('message="^this commit adds a fix" flags="mi"'), '- fix: Commit 4\n', 'an explicit `m` is fine');
	t.end();
});

test('commit-list helper: rejects flags other than i, m, s, and u', (t) => {
	for (const flags of ['g', 'y', 'd', 'v', 'x']) {
		const compile = Handlebars.compile(`{{#commit-list commits subject="a" flags="${flags}"}}{{/commit-list}}`);
		t.throws(() => compile({ commits }), new RegExp(`flags\` may only contain .*got \`${flags}\``), `rejects \`${flags}\``);
	}
	const nonString = Handlebars.compile('{{#commit-list commits subject="a" flags=1}}{{/commit-list}}');
	t.throws(() => nonString({ commits }), TypeError, 'rejects a non-string');
	t.end();
});

test('commit-list helper: returns nothing if nothing matches', (t) => {
	const compile = Handlebars.compile([
		'{{#commit-list commits heading="# Heading" message="A string that never appears"}}',
		'- {{subject}}',
		'{{/commit-list}}',
	].join('\n'));
	const expected = '';
	t.equal(compile({ commits }), expected);
	t.end();
});
