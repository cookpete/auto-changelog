const test = require('tape')
const Handlebars = require('handlebars')
const releases = require('./data/releases')

const compileCommits = (matches) => Handlebars.compile(
	'{{#each releases}}\n' +
		'{{#each commits}}\n' +
			matches +
		'{{/each}}\n' +
	'{{/each}}',
	{ noEscape: true }
)

test('matches helper: matches on field value', t => {
	const matches =
		'{{#matches href "12c0624"}}\n' +
			'- {{message}}\n' +
		'{{/matches}}\n'
	const expected =
		'- Commit that fixes nothing with `backticks` and &lt;html&gt;\n'
	t.equal(compileCommits(matches)({ releases }), expected)
	t.end()
})

test('matches helper: matches with case insensitive flag', t => {
	const matches =
		'{{#matches author "example" flags="i"}}\n' +
			'- {{shorthash}}\n' +
		'{{/matches}}\n'
	const expected =
		'- b0b3040\n' +
		'- 12c0624\n' +
		'- e9a43b2\n' +
		'- 158fdde\n'
	t.equal(compileCommits(matches)({ releases }), expected)
	t.end()
})

test('matches helper: provides non-matching conditional', t => {
	const matches =
		'{{#matches shorthash "e9a43b2"}}\n' +
			'- HIT {{date}}\n' +
		'{{else}}\n' +
			'- MISS {{date}}\n' +
		'{{/matches}}\n'
	const expected =
		'- MISS 2015-12-29T21:57:19.000Z\n' +
		'- MISS 2015-12-29T21:18:19.000Z\n' +
		'- HIT 2015-12-29T21:19:19.000Z\n' +
		'- MISS 2015-12-14T17:06:12.000Z\n'
	t.equal(compileCommits(matches)({ releases }), expected)
	t.end()
})

test('matches helper: matches on multiline content', t => {
	const multiReleases = [{
		commits: [
			{
				shorthash: 'c0f25d7',
				message: 'Hello\n\nWorld\n\nBREAKING CHANGE: mock break\n\nsome more text'
			},
			{
				shorthash: '12cd728',
				message: 'Nope'
			}
		]
	}]
	const matches =
		'{{#matches message "BREAKING CHANGE"}}\n' +
			'- {{shorthash}}\n' +
		'{{/matches}}\n'
	const expected =
		'- c0f25d7\n'
	t.equal(compileCommits(matches)({ releases: multiReleases }), expected)
	t.end()
})
