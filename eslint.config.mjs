import nodeConfig from '@ljharb/eslint-config/flat/node/22';

export default [
	{
		ignores: [
			'coverage/',
			'test/data/',
		],
	},
	...nodeConfig,
	{
		files: ['**/*.js'],
		rules: {
			'func-style': ['error', 'declaration'],
			'multiline-comment-style': 'off',
			'operator-linebreak': [
				'error',
				'after',
				{
					overrides: {
						':': 'before',
						'?': 'before',
						'|>': 'before',
					},
				},
			],
			'sort-keys': 'off',
		},
	},

	{
		files: ['src/template.js'],
		rules: {
			'global-require': 'warn',
		},
	},

	{
		files: [
			'src/releases.js',
			'src/tags.js',
		],
		rules: {
			'id-length': 'warn',
		},
	},

	{
		files: ['src/tags.js'],
		rules: {
			'max-len': 'warn',
		},
	},

	{
		files: ['src/options.js'],
		rules: {
			'max-lines': 'warn',
		},
	},

	{
		files: [
			'src/options.js',
			'src/remote.js',
		],
		rules: {
			'max-lines-per-function': 'warn',
		},
	},

	{
		files: [
			'src/releases.js',
			'src/run.js',
		],
		rules: {
			'max-params': 'warn',
		},
	},

	{
		files: [
			'src/parse-commits.js',
			'src/releases.js',
			'src/remote.js',
		],
		rules: {
			'max-statements-per-line': ['error', { max: 2 }],
		},
	},

	{
		files: [
			'src/options.js',
			'src/releases.js',
		],
		rules: {
			'no-await-in-loop': 'warn',
		},
	},

	{
		files: ['test/run.js'],
		rules: {
			'no-empty-function': 'warn',
		},
	},

	{
		files: ['test/template.js'],
		rules: {
			'no-param-reassign': 'warn',
		},
	},

	{
		files: ['src/template.js'],
		rules: {
			'no-return-await': 'warn',
		},
	},

	{
		files: [
			'src/tags.js',
			'test/run.js',
		],
		rules: {
			'no-unused-vars': 'warn',
		},
	},

	{
		files: [
			'src/options.js',
			'src/parse-commits.js',
			'src/releases.js',
		],
		rules: {
			'prefer-named-capture-group': 'warn',
		},
	},
];
