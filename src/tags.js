'use strict';

const semver = require('semver');
const cmd = require('./cmd');
const { niceDate, updateLog } = require('./utils');

const DIVIDER = '---';
const MATCH_V = /^v\d/;

const DEPENDENCIES = { cmd };

function removePrefix(tag, tagPrefix) {
	return tagPrefix && tag.startsWith(tagPrefix) ? tag.slice(tagPrefix.length) : tag;
}

function inferSemver(rawTag, {
	tagPrefix,
	tagParserPattern,
	tagParserReplacement,
} = {}) {
	if (!!tagParserPattern && !!tagParserReplacement) {
		return rawTag.replace(new RegExp(tagParserPattern), tagParserReplacement);
	}

	const tag = removePrefix(rawTag, tagPrefix);

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

function parseTag(options) {
	const { tagPrefix, stripTagPrefix } = options;
	return (string) => {
		const [tag, date] = string.split(DIVIDER);
		return {
			tag,
			date,
			title: stripTagPrefix ? removePrefix(tag, tagPrefix) : tag,
			version: inferSemver(tag, options),
		};
	};
}

function isStable(version) {
	return !!semver.valid(version) && !semver.prerelease(version);
}

// A stable release covers the changes since the previous stable release, including those of
// the prereleases in between, which keep their own entries too. `rollupPrereleasesDisabled`
// turns that off, or, given a version, turns it off only for releases up to that version,
// so that turning it on doesn't rewrite releases already in a changelog.
function getRollsUp({ rollupPrereleasesDisabled: disabled, tagPrefix }) {
	if (disabled === true) {
		return () => false;
	}
	if (!disabled) {
		return isStable;
	}
	const until = inferSemver(removePrefix(String(disabled), tagPrefix));
	if (!semver.valid(until)) {
		throw new TypeError(`\`--rollup-prereleases-disabled\` takes a version, or no value; got \`${disabled}\``);
	}
	return (version) => isStable(version) && semver.gt(version, until);
}

function getPrevious(tags, index, rollsUp) {
	const earlier = tags.slice(index + 1);
	return rollsUp(tags[index].version) ? earlier.find((t) => isStable(t.version)) : earlier[0];
}

function enrichTag({ getCompareLink }, rollsUp) {
	return (t, index, tags) => {
		const previous = getPrevious(tags, index, rollsUp);
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
			return semver.compareBuild(b, a);
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
		const semverEndingVersion = inferSemver(removePrefix(endingVersion, tagPrefix));
		if (!semver.valid(semverEndingVersion)) {
			throw new Error(`Ending version '${endingVersion}' is not a valid version, and does not match any tag`);
		}
		const fallbackIndex = tags.findIndex(({ version }) => semver.valid(version) &&
			semver.compareBuild(version, semverEndingVersion) <= 0);
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
		const semverStartingVersion = inferSemver(removePrefix(startingVersion, tagPrefix));
		const index = tags.findIndex(({ tag }) => tag === startingVersion || tag === semverStartingVersion);
		if (index !== -1) {
			return index + 1;
		}
		if (!semver.valid(semverStartingVersion)) {
			throw new Error(`Starting version '${startingVersion}' is not a valid version, and does not match any tag`);
		}
		// Fall back to nearest version lower than startingVersion
		const fallbackIndex = tags.findIndex(({ version }) => semver.valid(version) &&
			semver.compareBuild(version, semverStartingVersion) < 0);
		// -1 as a slice end would drop the oldest release rather than include every tag
		return fallbackIndex === -1 ? tags.length : fallbackIndex;
	}
	if (startingDate) {
		return tags.filter((t) => t.isoDate >= startingDate).length;
	}
	return tags.length;
}

const LISTED_TAGS = 3;

function listTags(tags) {
	const shown = tags.slice(0, LISTED_TAGS).map(({ tag }) => tag).join(', ');
	return tags.length > LISTED_TAGS ? `${shown}, …` : shown;
}

// A tag prefix decides which tags are this changelog's releases. Version tags without it
// were releases before v3, so leaving them out is reported, and is an error when they are
// the only version tags, since then the prefix is most likely wrong.
function filterByPrefix(tags, options) {
	const { tagPrefix } = options;
	if (!tagPrefix) {
		return tags;
	}
	const prefixed = tags.filter(({ tag }) => tag.startsWith(tagPrefix));
	const skipped = tags
		.filter(({ tag }) => !tag.startsWith(tagPrefix))
		.filter(isValidTag(options))
		.sort(sortTags(options));
	if (skipped.length > 0) {
		const count = skipped.length === 1 ? '1 version tag' : `${skipped.length} version tags`;
		if (!prefixed.some(isValidTag(options))) {
			throw new Error(`No version tags start with the tag prefix "${tagPrefix}", but ${count} without it ${skipped.length === 1 ? 'does' : 'do'} (${listTags(skipped)}); check \`--tag-prefix\`, or for a monorepo package, its \`name\` and \`--autodetect-monorepo-disabled\``);
		}
		updateLog(`skipped ${count} without the tag prefix "${tagPrefix}" (${listTags(skipped)})\n`);
	}
	return prefixed;
}

// A compare link to `HEAD` shows the remote's default branch, so on another branch,
// link to the remote branch it tracks. Anything unknown keeps `HEAD`, which also keeps
// existing links unchanged when the changelog is generated on the default branch.
async function getUnreleasedTarget({ remote }, command) {
	const branch = (await command('git symbolic-ref -q HEAD')).trim();
	if (!branch) {
		return 'HEAD';
	}
	const upstream = await command(`git for-each-ref --format=%(upstream:remotename)${DIVIDER}%(upstream:remoteref) ${branch}`);
	const [remoteName, remoteRef = ''] = upstream.trim().split(DIVIDER);
	if (remoteName !== remote || !remoteRef.startsWith('refs/heads/')) {
		return 'HEAD';
	}
	const remoteBranch = remoteRef.slice('refs/heads/'.length);
	const defaultBranch = (await command(`git symbolic-ref -q refs/remotes/${remote}/HEAD`)).trim();
	if (!defaultBranch || defaultBranch === `refs/remotes/${remote}/${remoteBranch}`) {
		return 'HEAD';
	}
	return remoteBranch;
}

async function fetchTags(options, overrides) {
	const { cmd: command } = { ...DEPENDENCIES, ...overrides };
	const format = `%(refname:short)${DIVIDER}%(creatordate:short)`;
	const parsed = (await command(`git tag -l --format=${format} ${options.appendGitTag}`))
		.trim()
		.split('\n')
		.map(parseTag(options));
	const tags = filterByPrefix(parsed, options)
		.filter(isValidTag(options))
		.sort(sortTags(options));
	const rollsUp = getRollsUp(options);

	const {
		unreleased,
		unreleasedOnly,
		getCompareLink,
		tagPrefix,
		stripTagPrefix,
	} = options;
	const previous = tags[0];
	const v = !MATCH_V.test(options.latestVersion) && previous && MATCH_V.test(previous.version) ? 'v' : '';
	// The compare link must target the real tag, which carries the tag prefix, and the
	// `v` convention (if any) still applies after that prefix (e.g. `my-package@v2.0.0`).
	// The title matches the other releases' titles: the full tag, unless the prefix is stripped.
	const latestTag = options.latestVersion ? `${tagPrefix || ''}${v}${options.latestVersion}` : null;
	const latestVersion = tags.some(({ tag }) => tag === latestTag) ? null : options.latestVersion;
	if (latestVersion || unreleased || unreleasedOnly) {
		const compareTo = latestVersion ? latestTag : await getUnreleasedTarget(options, command);
		const latestTitle = stripTagPrefix ? `${v}${latestVersion}` : latestTag;
		const base = latestVersion && rollsUp(latestVersion) ? tags.find((t) => isStable(t.version)) : previous;
		tags.unshift({
			tag: null,
			title: latestVersion ? latestTitle : 'Unreleased',
			date: new Date().toISOString(),
			diff: base ? `${base.tag}..` : 'HEAD',
			href: base ? getCompareLink(base.tag, compareTo) : null,
		});
	}

	const enriched = tags.map(enrichTag(options, rollsUp));
	return enriched.slice(getStartIndex(enriched, options), getEndIndex(enriched, options));
}

module.exports = {
	fetchTags,
};
