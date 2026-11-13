'use strict';

const semver = require('semver');
const cmd = require('./cmd');
const { niceDate } = require('./utils');

const DIVIDER = '---';
const MATCH_V = /^v\d/;

const DEPENDENCIES = { cmd };

function inferSemver(tag) {
	if ((/^v?\d+$/).test(tag)) {
		// v1 becomes v1.0.0
		return `${tag}.0.0`;
	}
	if ((/^v?\d+\.\d+$/).test(tag)) {
		// v1.0 becomes v1.0.0
		return `${tag}.0`;
	}
	return tag;
}

function parseTag({ tagPrefix, stripTagPrefix }) {
	return (string) => {
		const [tag, date] = string.split(DIVIDER);
		return {
			tag,
			date,
			title: stripTagPrefix ? tag.replace(tagPrefix, '') : tag,
			version: inferSemver(tag.replace(tagPrefix, '')),
		};
	};
}

function enrichTag({ getCompareLink }) {
	return (t, index, tags) => {
		const previous = tags[index + 1];
		return {
			isoDate: t.date.slice(0, 10),
			niceDate: niceDate(t.date),
			diff: previous ? `${previous.tag}..${t.tag}` : t.tag,
			href: previous ? getCompareLink(previous.tag, t.tag || 'HEAD') : null,
			major: Boolean(previous &&
				semver.valid(t.version) &&
				semver.valid(previous.version) &&
				semver.diff(t.version, previous.version) === 'major'),
			minor: Boolean(previous &&
				semver.valid(t.version) &&
				semver.valid(previous.version) &&
				['minor', 'preminor'].includes(semver.diff(t.version, previous.version))),
			...t,
		};
	};
}

function isValidTag({ tagPattern }) {
	return ({ tag, version }) => {
		if (tagPattern) {
			return new RegExp(tagPattern).test(tag);
		}
		return semver.valid(version);
	};
}

function sortTags({ appendGitTag }) {
	return ({ version: a }, { version: b }) => {
		if ((/--sort/).test(appendGitTag)) {
			return 0;
		}
		if (semver.valid(a) && semver.valid(b)) {
			return semver.rcompare(a, b);
		}
		return a < b ? 1 : -1;
	};
}

function getStartIndex(tags, { endingVersion, tagPrefix }) {
	if (endingVersion) {
		const index = tags.findIndex(({ tag }) => tag === endingVersion);
		if (index !== -1) {
			return index;
		}
		const semverEndingVersion = inferSemver(endingVersion.replace(tagPrefix, ''));
		if (!semver.valid(semverEndingVersion)) {
			throw new Error(`Ending version '${endingVersion}' is not a valid version, and does not match any tag`);
		}
		const fallbackIndex = tags.findIndex(({ version }) => semver.valid(version) &&
			semver.lte(version, semverEndingVersion));
		return fallbackIndex === -1 ? tags.length : fallbackIndex;
	}
	return 0;
}

function getEndIndex(tags, {
	unreleasedOnly,
	startingVersion,
	startingDate,
	tagPrefix,
}) {
	if (unreleasedOnly) {
		return 1;
	}
	if (startingVersion) {
		const semverStartingVersion = inferSemver(startingVersion.replace(tagPrefix, ''));
		const index = tags.findIndex(({ tag }) => tag === startingVersion || tag === semverStartingVersion);
		if (index !== -1) {
			return index + 1;
		}
		if (!semver.valid(semverStartingVersion)) {
			throw new Error(`Starting version '${startingVersion}' is not a valid version, and does not match any tag`);
		}
		// Fall back to nearest version lower than startingVersion
		const fallbackIndex = tags.findIndex(({ version }) => semver.valid(version) && semver.lt(version, semverStartingVersion));
		// -1 as a slice end would drop the oldest release rather than include every tag
		return fallbackIndex === -1 ? tags.length : fallbackIndex;
	}
	if (startingDate) {
		return tags.filter((t) => t.isoDate >= startingDate).length;
	}
	return tags.length;
}

async function fetchTags(options, overrides) {
	const { cmd: command } = { ...DEPENDENCIES, ...overrides };
	const format = `%(refname:short)${DIVIDER}%(creatordate:short)`;
	const tags = (await command(`git tag -l --format=${format} ${options.appendGitTag}`))
		.trim()
		.split('\n')
		.map(parseTag(options))
		.filter(isValidTag(options))
		.sort(sortTags(options));

	const {
		unreleased,
		unreleasedOnly,
		getCompareLink,
		tagPrefix,
		stripTagPrefix,
	} = options;
	const previous = tags[0];
	const v = !MATCH_V.test(options.latestVersion) && previous && MATCH_V.test(previous.version) ? 'v' : '';
	// The title shows the bare version, but the compare link must target the real
	// tag. In a monorepo that is prefixed with the package name, and the `v`
	// convention (if any) still applies after that prefix (e.g. `my-package@v2.0.0`).
	const prefix = stripTagPrefix && tagPrefix ? `${tagPrefix}${v}` : v;
	const latestTag = options.latestVersion ? `${prefix}${options.latestVersion}` : null;
	const latestVersion = tags.some(({ tag }) => tag === latestTag) ? null : options.latestVersion;
	if (latestVersion || unreleased || unreleasedOnly) {
		const compareTo = latestVersion ? latestTag : 'HEAD';
		tags.unshift({
			tag: null,
			title: latestVersion ? `${v}${latestVersion}` : 'Unreleased',
			date: new Date().toISOString(),
			diff: previous ? `${previous.tag}..` : 'HEAD',
			href: previous ? getCompareLink(previous.tag, compareTo) : null,
		});
	}

	const enriched = tags.map(enrichTag(options));
	return enriched.slice(getStartIndex(enriched, options), getEndIndex(enriched, options));
}

module.exports = {
	fetchTags,
};
