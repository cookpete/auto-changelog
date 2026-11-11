'use strict';

const test = require('tape');
const Handlebars = require('handlebars');
const releases = require('./data/releases');

function compileCommits(matches) {
	return Handlebars.compile(
		[
			'{{#each releases}}',
			'{{#each commits}}',
			matches,
			'{{/each}}',
			'{{/each}}',
		].join('\n'),
		{ noEscape: true },
	);
}

test('matches helper: matches on field value', (t) => {
	const matches = [
		'{{#matches href "12c0624"}}',
		'- {{message}}',
		'{{/matches}}',
	].join('\n');
	const expected = '- Commit that fixes nothing with `backticks` and &lt;html&gt;\n';
	t.equal(compileCommits(matches)({ releases }), expected);
	t.end();
});

test('matches helper: matches with case insensitive flag', (t) => {
	const matches = [
		'{{#matches author "example" flags="i"}}',
		'- {{shorthash}}',
		'{{/matches}}',
	].join('\n');
	const expected = [
		'- b0b3040',
		'- 12c0624',
		'- e9a43b2',
		'- 158fdde',
		'',
	].join('\n');
	t.equal(compileCommits(matches)({ releases }), expected);
	t.end();
});

test('matches helper: provides non-matching conditional', (t) => {
	const matches = [
		'{{#matches shorthash "e9a43b2"}}',
		'- HIT {{date}}',
		'{{else}}',
		'- MISS {{date}}',
		'{{/matches}}',
	].join('\n');
	const expected = [
		'- MISS 2015-12-29T21:57:19.000Z',
		'- MISS 2015-12-29T21:18:19.000Z',
		'- HIT 2015-12-29T21:19:19.000Z',
		'- MISS 2015-12-14T17:06:12.000Z',
		'',
	].join('\n');
	t.equal(compileCommits(matches)({ releases }), expected);
	t.end();
});

test('matches helper: matches on multiline content', (t) => {
	const multiReleases = [{
		commits: [
			{
				shorthash: 'c0f25d7',
				message: 'Hello\n\nWorld\n\nBREAKING CHANGE: mock break\n\nsome more text',
			},
			{
				shorthash: '12cd728',
				message: 'Nope',
			},
		],
	}];
	const matches = [
		'{{#matches message "BREAKING CHANGE"}}',
		'- {{shorthash}}',
		'{{/matches}}',
	].join('\n');
	const expected = '- c0f25d7\n';
	t.equal(compileCommits(matches)({ releases: multiReleases }), expected);
	t.end();
});
