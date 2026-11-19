import { createRequire } from 'module';
import { dirname, join } from 'path';
import Handlebars from 'handlebars';
import {
	readFile,
	fileExists,
	isURL,
} from './utils.mjs';

const require = createRequire(import.meta.url);

async function fetchText(url) {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Template '${url}' could not be fetched: ${response.status} ${response.statusText}`);
	}
	return response.text();
}

const TEMPLATES_DIR = join(import.meta.dirname, '..', 'templates');
const COMPILE_OPTIONS = {
	noEscape: true,
};

Handlebars.registerHelper('json', (object) => new Handlebars.SafeString(JSON.stringify(object, null, 2)));

// `g` and `y` would make `test` stateful across commits, so only flags that change what matches are allowed.
const COMMIT_LIST_FLAGS = /^[imsu]*$/;

Handlebars.registerHelper('commit-list', (context, options) => {
	if (!context || context.length === 0) {
		return '';
	}

	const {
		exclude,
		message,
		subject,
		heading,
		flags = '',
	} = options.hash;

	if (typeof flags !== 'string' || !COMMIT_LIST_FLAGS.test(flags)) {
		throw new TypeError(`commit-list: \`flags\` may only contain \`i\`, \`m\`, \`s\`, and \`u\`; got \`${flags}\``);
	}
	const messageFlags = [...new Set(`m${flags}`)].join('');

	const list = context
		.filter((item) => {
			const commit = item.commit || item;
			// A commit a `processCommits` plugin adds may not have a `rawMessage`
			const text = commit.rawMessage ?? commit.message;
			if (exclude) {
				const pattern = new RegExp(exclude, messageFlags);
				if (pattern.test(text)) {
					return false;
				}
			}
			if (message) {
				const pattern = new RegExp(message, messageFlags);
				return pattern.test(text);
			}
			if (subject) {
				const pattern = new RegExp(subject, flags);
				return pattern.test(commit.subject);
			}
			return true;
		})
		.map((item) => options.fn(item))
		.join('');

	if (!list) {
		return '';
	}

	if (!heading) {
		return list;
	}

	return `${heading}\n\n${list}`;
});

Handlebars.registerHelper('matches', function (val, pattern, options) {
	const r = new RegExp(pattern, options.hash.flags || '');
	return r.test(val) ? options.fn(this) : options.inverse(this); // eslint-disable-line no-invalid-this
});

async function getTemplate(template) {
	if (isURL(template)) {
		return await fetchText(template);
	}
	if (await fileExists(template)) {
		return readFile(template);
	}
	const path = join(TEMPLATES_DIR, `${template}.hbs`);
	if (dirname(path) !== TEMPLATES_DIR || await fileExists(path) === false) {
		throw new Error(`Template '${template}' was not found`);
	}
	return readFile(path);
}

function cleanTemplate(template, { keepIndentation }) {
	const unindented = keepIndentation
		? template
		: template
			// Remove indentation
			.replace(/\n +/g, '\n')
			.replace(/^ +/, '');
	return unindented
		// Fix multiple blank lines
		.replace(/\n\n\n+/g, '\n\n')
		.replace(/\n\n$/, '\n');
}

async function compileTemplate(releases, options) {
	const { template, handlebarsSetup } = options;
	if (handlebarsSetup) {
		const path = (/^\//).test(handlebarsSetup) ? handlebarsSetup : join(process.cwd(), handlebarsSetup);
		const setup = require(path);
		if (typeof setup === 'function') {
			setup(Handlebars);
		}
	}
	const compile = Handlebars.compile(await getTemplate(template), COMPILE_OPTIONS);
	if (template === 'json') {
		return compile({ releases, options });
	}
	return cleanTemplate(compile({ releases, options }), options);
}

export {
	compileTemplate,
};
