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
	const compile = Handlebars.compile('{{#commit-list commits heading="# Heading"}}\n' +
			'- {{subject}}\n' +
		'{{/commit-list}}');
	const expected = '';
	t.equal(compile({ commits: [] }), expected);
	t.end();
});

test('commit-list helper: returns all commits with no options', (t) => {
	const compile = Handlebars.compile('{{#commit-list commits heading="# Heading"}}\n' +
			'- {{subject}}\n' +
		'{{/commit-list}}');
	const expected =
		'# Heading\n\n' +
		'- Commit 1\n' +
		'- Commit 2\n' +
		'- feat: Commit 3\n' +
		'- fix: Commit 4\n';

	t.equal(compile({ commits }), expected);
	t.end();
});

test('commit-list helper: supports subject pattern matching', (t) => {
	const compile = Handlebars.compile('{{#commit-list commits heading="# Heading" subject="^feat: "}}\n' +
			'- {{subject}}\n' +
		'{{/commit-list}}');
	const expected =
		'# Heading\n\n' +
		'- feat: Commit 3\n';
	t.equal(compile({ commits }), expected);
	t.end();
});

test('commit-list helper: supports merge subject pattern matching', (t) => {
	const compile = Handlebars.compile('{{#commit-list merges heading="# Heading" subject="^feat: "}}\n' +
			'- {{commit.subject}}\n' +
		'{{/commit-list}}');
	const expected =
		'# Heading\n\n' +
		'- feat: Commit 3\n';
	t.equal(compile({ merges }), expected);
	t.end();
});

test('commit-list helper: supports commit lists with no heading', (t) => {
	const compile = Handlebars.compile('{{#commit-list merges heading="# Heading" subject="^fix: "}}\n' +
			'- {{commit.subject}}\n' +
		'{{/commit-list}}\n' +
		'{{#commit-list commits subject="^fix: "}}\n' +
			'- {{subject}}\n' +
		'{{/commit-list}}\n');
	const expectedMerges =
		'# Heading\n\n' +
		'- fix: Commit 4\n';
	const expectedCommits = '- fix: Commit 4\n';
	t.equal(compile({ merges }), expectedMerges);
	t.equal(compile({ commits }), expectedCommits);
	t.end();
});

test('commit-list helper: supports message pattern matching', (t) => {
	const compile = Handlebars.compile('{{#commit-list commits heading="# Breaking Changes" message="^BREAKING CHANGE: "}}\n' +
			'- {{subject}}\n' +
		'{{/commit-list}}');
	const expected =
		'# Breaking Changes\n\n' +
		'- Commit 2\n';
	t.equal(compile({ commits }), expected);
	t.end();
});

test('commit-list helper: supports excludes option', (t) => {
	const compile = Handlebars.compile('{{#commit-list commits heading="# Heading" exclude="^BREAKING CHANGE: "}}\n' +
			'- {{subject}}\n' +
		'{{/commit-list}}');
	const expected =
		'# Heading\n\n' +
		'- Commit 1\n' +
		'- feat: Commit 3\n' +
		'- fix: Commit 4\n';
	t.equal(compile({ commits }), expected);
	t.end();
});

test('commit-list helper: returns nothing if nothing matches', (t) => {
	const compile = Handlebars.compile('{{#commit-list commits heading="# Heading" message="A string that never appears"}}\n' +
			'- {{subject}}\n' +
		'{{/commit-list}}');
	const expected = '';
	t.equal(compile({ commits }), expected);
	t.end();
});
