import test from 'tape';
import { createServer } from 'http';
import { join } from 'path';
import { readFile } from '../src/utils.mjs';
import releases from './data/releases.mjs';
import { compileTemplate } from '../src/template.mjs';
import { parseCommits, COMMIT_SEPARATOR, MESSAGE_SEPARATOR } from '../src/parse-commits.mjs';
import remotes from './data/remotes.mjs';

test('compileTemplate: compiles using compact template', async (t) => {
	const expected = await readFile(join(import.meta.dirname, 'data', 'template-compact.md'));
	t.equal(await compileTemplate(releases, { template: 'compact' }), expected);
});

test('compileTemplate: compiles using keepachangelog template', async (t) => {
	const expected = await readFile(join(import.meta.dirname, 'data', 'template-keepachangelog.md'));
	t.equal(await compileTemplate(releases, { template: 'keepachangelog' }), expected);
});

test('compileTemplate: compiles using json template', async (t) => {
	const expected = await readFile(join(import.meta.dirname, 'data', 'template-json.json'));
	t.equal(await compileTemplate(releases, { template: 'json' }), expected);
});

test('compileTemplate: compiles using path to template file', async (t) => {
	const path = join(import.meta.dirname, 'data', 'template-compact.md');
	const expected = await readFile(path);
	t.equal(await compileTemplate(releases, { template: path }), expected);
});

test('compileTemplate: compiles using url path', async (t) => {
	const template = await readFile(join(import.meta.dirname, '..', 'templates', 'compact.hbs'));
	const expected = await readFile(join(import.meta.dirname, 'data', 'template-compact.md'));
	const server = createServer((request, response) => response.end(template));
	await new Promise((resolve) => { server.listen(0, '127.0.0.1', resolve); });
	try {
		const { port } = server.address();
		t.equal(await compileTemplate(releases, { template: `http://127.0.0.1:${port}/compact.hbs` }), expected);
	} finally {
		server.close();
	}
});

test('compileTemplate: throws an error when the url template responds with an error status', async (t) => {
	const server = createServer((request, response) => {
		response.statusCode = 404;
		response.end('Not Found');
	});
	await new Promise((resolve) => { server.listen(0, '127.0.0.1', resolve); });
	try {
		const { port } = server.address();
		const url = `http://127.0.0.1:${port}/missing.hbs`;
		await compileTemplate(releases, { template: url }).then(
			() => t.fail('Should throw an error'),
			(error) => t.equal(error.message, `Template '${url}' could not be fetched: 404 Not Found`),
		);
	} finally {
		server.close();
	}
});

test('compileTemplate: throws an error when no template found', (t) => compileTemplate(releases, { template: 'not-found' })
	.then(() => t.fail('Should throw an error'))
	.catch(() => t.pass('threw')));

test('compileTemplate: supports handlebarsSetup option', async (t) => {
	const path = join(import.meta.dirname, 'data', 'template-custom-helper.md');
	const expected = await readFile(join(import.meta.dirname, 'data', 'template-custom-helper-compiled.md'));
	t.equal(
		await compileTemplate(releases, {
			template: path,
			handlebarsSetup: './test/data/handlebars-setup.js',
		}),
		expected,
	);
});

test('compileTemplate: requires a handlebarsSetup file by absolute path, even when it exports no function', async (t) => {
	t.equal(
		await compileTemplate(releases, {
			template: join(import.meta.dirname, 'data', 'template-on-require.hbs'),
			handlebarsSetup: join(import.meta.dirname, 'data', 'handlebars-setup-on-require.js'),
		}),
		'registered on require\n',
	);
});

test('compileTemplate: supports keepIndentation option', async (t) => {
	const template = join(import.meta.dirname, 'data', 'template-indented.hbs');
	const titles = releases.map(({ title }) => title);

	t.equal(
		await compileTemplate(releases, { template }),
		`${titles.map((title) => `- ${title}\nindented line\n`).join('')}`,
		'removes indentation by default',
	);
	t.equal(
		await compileTemplate(releases, { template, keepIndentation: true }),
		`${titles.map((title) => `- ${title}\n  indented line\n`).join('')}`,
		'keeps indentation with keepIndentation',
	);
});

test('compileTemplate: a built-in template name can\'t be a path', async (t) => {
	const templates = ['../test/data/template-indented', 'nested/compact'];
	const errors = await Promise.all(templates.map((template) => compileTemplate([], { template }).then(
		() => null,
		(error) => error,
	)));
	templates.forEach((template, i) => {
		t.equal(errors[i] && errors[i].message, `Template '${template}' was not found`, template);
	});
});

test('compileTemplate: the conventional template groups commits by their text before replaceText', async (t) => {
	const gitLog = ['feat: add a thing', 'fix: Breaking change: remove a thing'].map((message, i) => [
		`${COMMIT_SEPARATOR}${String(i).repeat(40)}`,
		'2026-11-17 12:00:00 +0000',
		'Example Author',
		'email@example.com',
		`${message}${MESSAGE_SEPARATOR}`,
		' 1 file changed, 1 insertion(+)',
		'',
	].join('\n')).join('');
	// What the conventional template says to configure
	const replaceText = {
		'([bB]reaking change:)': '',
		'(^[fF]eat:)': '',
		'(^[fF]ix:)': '',
	};
	const commits = parseCommits(gitLog, { replaceText, ...remotes.github });
	const changelog = await compileTemplate(
		[{ title: 'v1.0.0', commits, merges: [], fixes: [] }],
		{ template: 'conventional' },
	);
	t.match(changelog, /#### Breaking Changes :warning:\n\n- +remove a thing/, 'the breaking change');
	t.match(changelog, /#### New Features\n\n- +add a thing/, 'the feature');
	t.doesNotMatch(changelog, /General Changes/, 'no ungrouped commits');
});
