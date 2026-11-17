# auto-changelog <sup>[![Version Badge][npm-version-svg]][package-url]</sup>

[![github actions][actions-image]][actions-url]
[![coverage][codecov-image]][codecov-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

[![npm badge][npm-badge-png]][package-url]

Command line tool for generating a changelog from git tags and commit history. Used by [Modernizr](https://modernizr.com), [Netlify](https://netlify.com), and [Velocity.js](http://velocityjs.org).

### Installation

```bash
npm install -g auto-changelog
```

### Usage

Simply run `auto-changelog` in the root folder of a git repository. `git log` is run behind the scenes in order to parse the commit history.

```sh
Usage: auto-changelog [options]

Options:
  -o, --output <file>                          output file (default: CHANGELOG.md)
  -c, --config <file>                          config file location (default: .auto-changelog)
      --extends <config>                       extend a JSON config file, by relative path or package path (e.g. my-config/auto-changelog.json)
  -t, --template <template>                    specify template to use [compact, keepachangelog, conventional, json] (default: compact)
  -r, --remote <remote>                        specify git remote to use for links (default: origin)
  -p, --[no-]package                           use version from package.json as latest release
      --package-file <file>                    use version from the specified file as latest release
      --latest-version <version>               use specified version as latest release
      --[no-]hide-credit                       hide auto-changelog credit
      --handlebars-setup <file>                handlebars setup file
      --[no-]keep-indentation                  keep indentation from the template in the output
      --[no-]prepend                           prepend changelog to output file
      --[no-]stdout                            output changelog to stdout
      --plugins [name]...                      use plugins to augment commit/merge/release information
      --[no-]verbose                           explain on stderr what was left out of the changelog, and why
      --[no-]unsafe-config                     trust in-repo config completely, honoring options that can load code, run git commands, or make network requests; do not use with untrusted repositories
      --help                                   Show this help text
      --version                                Show the version number

Releases:
  -u, --[no-]unreleased                        include section for unreleased changes
      --tag-pattern <regex>                    override regex pattern for version tags
      --tag-prefix <prefix>                    prefix used in version tags; only tags starting with it are releases
      --tag-parser-pattern <regex>             pattern used to capture values in tags for replacement
      --tag-parser-replacement <string>        replaces captures supplied in the --tag-parser-pattern option to create valid semver tags
      --[no-]strip-tag-prefix                  strip the tag prefix from release titles (default: on for a detected monorepo package)
      --[no-]autodetect-monorepo-disabled      disable detecting a monorepo package and stripping its name-based tag prefix from release titles
      --release-limit <count>                  number of releases to display, newest first, counting an unreleased or latest version section
      --rollup-prereleases-disabled [version]  do not include prerelease changes in the release that follows them; given a version, only for releases up to it
      --starting-version <tag>                 specify earliest version to include in changelog
      --starting-date <yyyy-mm-dd>             specify earliest release date to include in changelog (filters releases by tag date, not commits)
      --ending-version <tag>                   specify latest version to include in changelog
      --[no-]release-summary                   use tagged commit message body as release summary
      --[no-]unreleased-only                   only output unreleased changes
      --[no-]hide-empty-releases               hide empty releases
      --append-git-tag <string>                string to append to git tag command

Commits:
  -l, --[no-]commit-limit <count>              number of commits to display per release (default: 3)
  -b, --[no-]backfill-limit <count>            number of commits to backfill empty releases with (default: 3)
      --issue-pattern <regex>                  override regex pattern for issues in commit messages
      --breaking-pattern <regex>               regex pattern for breaking change commits
      --merge-pattern <regex>                  add custom regex pattern for merge commits
      --commit-pattern <regex>                 pattern to include when parsing commits
      --ignore-commit-pattern <regex>          pattern to ignore when parsing commits, matched against commit subjects and merged pull request titles
      --sort-commits <property>                sort commits by property [relevance, date, date-desc, subject, subject-desc] (default: relevance)
      --append-git-log <string>                string to append to git log command

Links:
      --commit-url <url>                       override url for commits, use {id} for commit id
      --issue-url <url>                        override url for issues, use {id} for issue id
      --merge-url <url>                        override url for merges, use {id} for merge id
      --compare-url <url>                      override url for compares, use {from} and {to} for tags
```

```bash
# Write log to CHANGELOG.md in current directory
auto-changelog

# Write log to HISTORY.md using keepachangelog template
auto-changelog --output HISTORY.md --template keepachangelog

# Disable the commit limit, rendering all commits for every release
auto-changelog --no-commit-limit

# Only include the 5 newest releases
auto-changelog --release-limit 5

# Append arguments to git log; a value starting with a dash must be attached with `=`
auto-changelog --append-git-log=--first-parent
```

### Node API

`require('auto-changelog')` runs nothing on its own; it exports `run`, which does what the command line does. It takes `process.argv`-style arguments - two leading entries, then any of the options above - and returns a promise. Invalid arguments are reported as on the command line and set `process.exitCode`; any other failure rejects the promise.

```js
const { run } = require('auto-changelog');

await run(['', '', '--output', 'HISTORY.md']);
```

### Requirements

`auto-changelog` is designed to be as flexible as possible, providing a clear changelog for any project. There are only two absolute requirements:

- You should be using git `1.7.2` or later
- All versions should be tagged using [semver](https://semver.org) tag names – this happens by default when using [`npm version`](https://docs.npmjs.com/cli/version)

There are some less strict requirements to improve your changelog:

- [Close issues using keywords](https://help.github.com/articles/closing-issues-using-keywords)
- Merge pull requests using the standard merge commit message for your platform

### Upgrading to v3

What to change:

- **node**: v3 requires node `^22.23 || ^24.20 || >= 25.9`.
- **Node API**: `require('auto-changelog')` no longer runs the CLI; call the exported [`run`](#node-api) instead. Only `auto-changelog` and `auto-changelog/package.json` can be required; the internal `auto-changelog/src/*` modules, which changed in v3, are no longer exported.
- **`--package <file>`**: `--package` no longer takes a file; use `--package-file <file>`. In a config file, a file path in `package` is now an error; use `packageFile`.
- **`--commit-limit false`, `--backfill-limit false`**: these now take only an integer; use `--no-commit-limit` or `--no-backfill-limit`. `false` still works in a config file.
- **`--plugins a b`**: repeat the flag for each plugin, as in `--plugins a --plugins b`. A `plugins` array in a config file is unchanged.
- **`--append-git-log`, `--append-git-tag`**: attach a value starting with a dash with `=`, as in `--append-git-log=--first-parent`.
- **Short flags**: `-v`, `-i`, `-h`, and `-V` are gone; use `--latest-version`, `--issue-url`, `--help`, and `--version`.
- **`--sort-commits`**: an unsupported value is now an error, rather than sorting by relevance.
- **Unexpected arguments**: an argument that is neither an option nor an option's value, like the `foo` in `auto-changelog foo`, is now an error; v2 ignored it.
- **Files outside the repository**: in-repo config, or a symlink in the repository, can no longer lead `auto-changelog` to read or write a file outside it ([Security](#security-and-untrusted-repositories)); pass such a path on the command line instead.

What may look different:

- **Monorepos**: [monorepo autodetection](#monorepos) is now on by default, so a detected package gets its tag prefix from its `name` (unless one is configured), and release titles without it. Set `autodetectMonorepoDisabled` to `true` to keep the v2 behavior.
- **Tag prefixes**: with a [tag prefix](#tag-prefixes), whether set or derived for a monorepo package, only tags that start with it are releases. Version tags without it, which v2 included, are left out and listed on stderr; if no version tags have the prefix, that is now an error.
- **Progress messages** go to stderr, so stdout carries only the changelog.
- **Failing git commands**: when a `git` command fails, for example because of a bad `--append-git-log` argument or when run outside a git repository, `auto-changelog` now stops with git's error, rather than writing an incomplete or empty changelog.
- **Prereleases**: a release after prereleases now [also lists their changes](#prereleases). To keep releases already in your changelog as they are, set `rollupPrereleasesDisabled` to your latest version, like `"rollupPrereleasesDisabled": "2.7.0"`; set it to `true` to never do this.
- **`--version`** prints the version with a `v` prefix, like `v3.0.0`.
- **`--ignore-commit-pattern`** also matches merged pull request titles, so it can hide merges as well as commits.
- **`--ending-version`** finds its release the way `--starting-version` does: the tag prefix and `v` are optional, and a version without a tag ends at the nearest older release. A value that is neither a tag nor a version is now an error; v2 ignored such a value, and listed every release.
- **Squash merges**: a commit whose subject ends in a pull request number, like `Fix a thing (#123)`, is now listed as a merged pull request even without a commit body, rather than as a commit; a pull request merged more than once in a release, like one that was also backported, is listed once.

### What you might do if you’re clever

Install `auto-changelog` to dev dependencies:

```bash
npm install auto-changelog --save-dev
```

Add `auto-changelog -p && git add CHANGELOG.md` to the `version` scripts in your `package.json`:

```json
{
  "name": "my-awesome-package",
  "version": "1.0.0",
  "devDependencies": {
    "auto-changelog": "*"
  },
  "scripts": {
    "version": "auto-changelog -p && git add CHANGELOG.md"
  }
}
```

Using `-p` or `--package` uses the `version` from `package.json` as the latest release, so that all commits between the previous release and now become part of that release. Essentially anything that would normally be parsed as `Unreleased` will now come under the `version` from `package.json`

To read the `version` from a different file, use `--package-file <file>` instead.

Now every time you run [`npm version`](https://docs.npmjs.com/cli/version), the changelog will automatically update and be part of the version commit.

### Advanced Usage

#### URL Overrides

Links to commits, issues, pull requests and version diffs are automatically generated based on your remote URL. GitHub, GitLab, BitBucket and Azure DevOps are all supported. If you have an unusual remote or need to override one of the link formats, use `--commit-url`, `--issue-url` or `--merge-url` with an `{id}` token. For custom version diffs, use `--compare-url` with `{from}` and `{to}` tokens.

```bash
# Link all issues to redmine
auto-changelog --issue-url https://www.redmine.org/issues/{id}

# Link to custom diff page
auto-changelog --compare-url https://example.com/repo/compare/{from}...{to}
```

#### Add to an existing changelog

If you’d like to keep an existing changelog below your generated one, just add `<!-- auto-changelog-above -->` to your current changelog. The generated changelog will be added above this token, and anything below will remain.

#### Configuration

You can set any option in `package.json` under the `auto-changelog` key, using camelCase options.

```js
{
  "name": "my-awesome-package",
  "version": "1.0.0",
  "scripts": {
    // ...
  },
  "auto-changelog": {
    "output": "HISTORY.md",
    "template": "keepachangelog",
    "unreleased": true,
    "commitLimit": false
  }
}
```

You can also store config options in an `.auto-changelog` file in your project root:

```js
{
  "output": "HISTORY.md",
  "template": "keepachangelog",
  "unreleased": true,
  "commitLimit": false
}
```

Note that any options set in `package.json` will take precedence over any set in `.auto-changelog`.

#### Sharing configuration

To share options between projects, put them in a JSON file and point `extends` at it, either by a path relative to the config that sets it, or by a path inside a package, resolved the way `require` would:

```js
{
  "extends": "@my-org/changelog-config/auto-changelog.json",
  "output": "HISTORY.md"
}
```

You can also pass `--extends` on the command line, where a relative path is resolved from the current directory.

- An extended config can itself use `extends`.
- Options set directly take precedence over extended ones (and `--extends` replaces any `extends` set in config, like every other option).
- `replaceText` maps are combined: your patterns are added to the extended ones, a pattern with the same key replaces the extended one, and a pattern set to `null` removes the extended one.
- An extended config is only ever read as JSON (never run as code), must resolve to a `.json` file inside the repository (including its `node_modules`), and is held to the same [security rules](#security-and-untrusted-repositories) as in-repo config.
- A config that uses `extends`, or is extended, can't set options that only apply on the command line (`config`, `unsafeConfig`, `help`, `version`).

#### Security and untrusted repositories

`auto-changelog` is sometimes run over repository content that you do not control - for example a CI job that checks out an untrusted pull request, or generating a changelog for a third-party repo on your own machine.
Because the `.auto-changelog` file and the `package.json` `auto-changelog` key live **inside** that repository, they are treated as untrusted input.
If in-repo config sets an option that could load code, inject extra git arguments, write outside the repository, or make a network request, `auto-changelog` **refuses to run** and exits with an error rather than silently ignoring the value.

These options can never come from in-repo config, because no value is safe - pass them as command line flags instead:

- `--handlebars-setup` (loads a JS file via `require`)
- `--plugins` (loads a JS module via `require`)
- `--template`, when it is a URL (fetched over the network)

These options _are_ honored from in-repo config, but a value that would do one of the unsafe things above is rejected:

- `remote`/`--remote` is used in a git command, so a value containing whitespace (which would inject extra git arguments) is rejected; ordinary remote names like `upstream` are fine.
- `output`/`--output` is a write path, so an absolute path or one containing `..` (which could write outside the repository) is rejected; ordinary in-repo paths like `HISTORY.md` are fine.
- `--append-git-log` and `--append-git-tag` are appended to the git commands, so a value containing `--output` (which would write to an arbitrary file) is rejected; ordinary arguments like `--first-parent` are fine.

The files `auto-changelog` reads or writes because of the repository must also really be inside it, following symlinks: `.auto-changelog`, `package.json`, a `template` file, a `packageFile`, and the output file (including the default `CHANGELOG.md`, unless you use `--stdout`). Otherwise, a symlink or a relative path in the repository could read any file on the machine into the changelog, or write over one. A path given on the command line is used as-is.

In every case, "rejected" means `auto-changelog` stops with an error - it never silently drops the value or produces a changelog from sanitized config. If you fully trust the repository you are running against and want to honor its config as-is, pass `--unsafe-config`. **Do not use `--unsafe-config` with repositories you do not control.**

#### Tag prefixes

Use `--tag-prefix [prefix]` if you prefix your version tags with a certain string:

```bash
# When all versions are tagged like my-package/1.2.3
auto-changelog --tag-prefix my-package/
```

Only tags that start with the prefix are releases; it is matched literally, and removed only from the start of a tag. Version tags without it are left out, and listed in a notice on stderr. If none of the version tags start with the prefix, that is an error, since the prefix is most likely wrong.

Tags with a leading `v`, like `v1.2.3`, are already valid version tags, so they do not need `--tag-prefix v`; but use it to leave out other version tags, like `1.2.3-4567` tags from a CI system:

```bash
# Only tags like v1.2.3 are releases
auto-changelog --tag-prefix v
```

By default, release titles show the full tag, like `my-package/1.2.3`. Pass `--strip-tag-prefix` to show only the version, like `1.2.3`; compare links still use the full tags.

#### Monorepos

In a monorepo, each package's version tags are typically prefixed with the package name, like `my-package@1.2.3`. By default, `auto-changelog` detects a monorepo package - by a `repository.directory` field in `package.json`, or an ancestor `package.json` within the same git repository declaring npm `workspaces` - and, for a detected package:

- derives the [tag prefix](#tag-prefixes) from the `name` in `package.json` (so you don't have to set `--tag-prefix` for every package), unless one is already configured, and
- strips that prefix from the release titles in the changelog (so headings read `## [1.2.3]` rather than `## [my-package@1.2.3]`), while still using the full tags for the compare links, unless [`--no-strip-tag-prefix`](#tag-prefixes) (or `"stripTagPrefix": false`) is set.

Since [only tags with the prefix are releases](#tag-prefixes), a detected package's changelog leaves out the repository's other version tags. If none of the version tags have the package's prefix, that is an error:

- for a package tagged like `v1.2.3`, pass `--tag-prefix v`;
- for a package that has no release tags yet, in a repository with other version tags, pass `--autodetect-monorepo-disabled --tag-pattern '^my-package@'` until its first release is tagged.

Autodetection is controlled by `--autodetect-monorepo-disabled`, which defaults to `false`. To opt out for a single run, pass `--autodetect-monorepo-disabled`. To opt out for the project, set it to `true`:

```json
{
  "auto-changelog": {
    "autodetectMonorepoDisabled": true
  }
}
```

#### Tag patterns

By default, `auto-changelog` looks for valid semver tags to build a list of releases. If you are using another format (or want to include all tags), use `--tag-pattern [regex]`:

```bash
# When all versions are tagged like build-12345
auto-changelog --tag-pattern 'build-\d+'

# Include any tag as a release
auto-changelog --tag-pattern .+
```

Including tags using this method does not guarantee correct tag order, however, since the sorting compares semver versions rather than their date or alphabetical order. For proper custom tag order, please refer to the [Tag parsing](#tag-parsing) section. Note, if a tag can be properly coerced into a valid semver string via the parsing options, the `--tag-pattern` is no longer needed.

#### Tag parsing

If you have an unconventional tagging pattern, you can provide a capture pattern and a replacement string through the `--tag-parser-pattern [regex]` and `--tag-parser-replacement [string]` options.

```bash
# When all versions are tagged like "my-package@1.2 build123"
auto-changelog --tag-parser-pattern "^my-package@(\d+)\.(\d+) build(\d+)$" --tag-parser-replacement "\$1.\$2.0-build.\$3"
```

Note, both options need to be supplied for this to work. Also note, `$` signs in the replacement string must be escaped (not applicable when configuring through package.json).

#### Prereleases

A prerelease, like `2.0.0-rc.1`, lists the changes since the release before it. A release after prereleases, like `2.0.0`, lists the changes since the previous release that is not a prerelease, including those already listed under its prereleases, so that upgrading from `1.x` shows everything that changed. The prereleases keep their own entries.

To list only a release's own changes, use `--rollup-prereleases-disabled`. To do that only for releases up to a version, so that the releases already in your changelog stay as they are, give it that version:

```bash
# Releases after 2.7.0 include the changes from their prereleases
auto-changelog --rollup-prereleases-disabled=2.7.0
```

#### Breaking changes

If you use a common pattern in your commit messages for breaking changes, use `--breaking-pattern` to highlight those commits as breaking changes in your changelog. Breaking change commits will always be listed as part of a release, regardless of any `--commit-limit` set.

```bash
auto-changelog --breaking-pattern "BREAKING CHANGE:"
```

#### Custom issue patterns

By default, `auto-changelog` will parse [GitHub-style issue fixes](https://help.github.com/articles/closing-issues-using-keywords/) in your commit messages. If you use Jira or an alternative pattern in your commits to reference issues, you can pass in a custom regular expression to `--issue-pattern` along with `--issue-url`:

```bash
# Parse Jira-style issues in your commit messages, like PROJECT-418
auto-changelog --issue-pattern '[A-Z]+-\d+' --issue-url https://issues.apache.org/jira/browse/{id}
```

Or, in your `package.json`:

```json
{
  "name": "my-awesome-package",
  "auto-changelog": {
    "issueUrl": "https://issues.apache.org/jira/browse/{id}",
    "issuePattern": "[A-Z]+-\\d+"
  }
}
```

If you use a certain pattern before or after the issue number, like `fixes {id}`, just use a capturing group:

```bash
# "This commit fixes ISSUE-123" will now parse ISSUE-123 as an issue fix
auto-changelog --issue-pattern "[Ff]ixes ([A-Z]+-\d+)"
```

#### How releases are built

With `--unreleased`, an `Unreleased` section covers the commits since the latest version tag. Its compare link targets `HEAD`, which hosts like GitHub show as the default branch; on another branch that tracks a branch on the remote, it targets that branch instead.

Each release covers the commits since the previous version tag (`git log <previous tag>..<tag>`), and lists them in three groups:

- **Merges**: merged pull requests, detected from GitHub merge and squash merge commits (a subject ending in `(#123)`), BitBucket and GitLab merge commits, and any `--merge-pattern`. A pull request merged more than once in a release, like a squash merge that was also backported, is listed once.
- **Fixes**: commits whose message closes an issue, like `Fixes #123` or `Closes https://github.com/user/repo/issues/123`, or matches `--issue-pattern`. A full link to one of the repository's own issues or pull requests is spelled like the remote's links, even if its letter case differs, like an owner renamed from `User` to `user`.
- **Commits**: everything else, except version commits (like `1.2.3`), `Merge branch` commits, and a merged pull request's own commits that have the same subject as its title. When the log may be missing commits (with `--commit-pattern`, `--ignore-commit-pattern`, `--append-git-log`, or a `processCommits` plugin), and a pull request branched off before the previous release, any commit with its title is left out, since it can't be ruled out as one of the pull request's own.

All merges and fixes are listed, but **commits are limited** to the 3 most relevant (the most lines changed) per release, or `--commit-limit`; a release with no merges or fixes uses `--backfill-limit` instead. Use `--no-commit-limit` to list every commit, and `--sort-commits` to change the order. [Breaking changes](#breaking-changes) are always listed, first.

To only include the newest releases, use `--release-limit`. It counts an `Unreleased` or `--latest-version` section, and applies after `--starting-version`, `--starting-date`, `--ending-version`, and `--hide-empty-releases`; each release shown still lists its changes since the release before it.

Commit message conventions aren't special: a `feat:` or `fix:` prefix is just part of the subject, so to group commits by type, use the built-in `conventional` template (`--template conventional`), which groups [Conventional Commits](https://www.conventionalcommits.org) by type and explains, in [its source](templates/conventional.hbs), the `replaceText` config it expects; or use the [`commit-list` helper](#commit-list-helper) in a custom template. To leave commits out entirely, use `--ignore-commit-pattern`, or `--commit-pattern` to only include matching commits.

To see why a tag, release, or commit is missing, use `--verbose`. It lists, on stderr, the config that was read, whether a monorepo package was detected, the `git` commands run, and each tag, release, and commit that was left out, with the reason. If the problem is in a template instead, generate the [JSON](#custom-templates) a template receives.

#### Custom templates

If you aren’t happy with the default templates or want to tweak something, you can point to a [handlebars](https://handlebarsjs.com) template in your local repo. Check out the [existing templates](templates) to see what is possible.

Save `changelog-template.hbs` somewhere in your repo:

```hbs
### Changelog
My custom changelog template. Don’t worry about indentation here; it is automatically removed from the output, unless you pass `--keep-indentation`.

{{#each releases}}
  Every release has a {{title}} and a {{href}} you can use to link to the commit diff.
  It also has an {{isoDate}} and a {{niceDate}} you might want to use.
  {{#each merges}}
    - A merge has a {{message}}, an {{id}} and a {{href}} to the PR.
  {{/each}}
  {{#each fixes}}
    - Each fix has a {{commit}} with a {{commit.subject}}, an {{id}} and a {{href}} to the fixed issue.
  {{/each}}
  {{#each commits}}
    - Commits have a {{shorthash}}, a {{subject}} and a {{href}}, {{author}} amongst other things.
  {{/each}}
{{/each}}
```

Then just use `--template` to point to your template:

```bash
auto-changelog --template changelog-template.hbs
```

You can also point to an external template by passing in a URL:

```bash
auto-changelog --template https://example.com/templates/compact.hbs
```

A URL template is fetched over the network, so it can only be passed on the command line;
setting `template` to a URL in in-repo config makes `auto-changelog` refuse to run (see [Security](#security-and-untrusted-repositories)).

To see exactly what data is passed in to the templates, you can generate a JSON version of the changelog:

```bash
auto-changelog --template json --output changelog-data.json
```

#### `commit-list` helper

Use `{{#commit-list}}` to render a list of commits depending on certain patterns in the commit messages:

```hbs
{{#each releases}}
  ### [{{title}}]({{href}})

  {{! List commits with `Breaking change: ` somewhere in the message }}
  {{#commit-list commits heading='### Breaking Changes' message='Breaking change: '}}
    - {{subject}} [`{{shorthash}}`]({{href}})
  {{/commit-list}}

  {{! List commits that add new features, but not those already listed above }}
  {{#commit-list commits heading='### New Features' message='feat: ' exclude='Breaking change: '}}
    - {{subject}} [`{{shorthash}}`]({{href}})
  {{/commit-list}}
{{/each}}
```

| Option | Description |
| --------- | ----------- |
| `heading` | A heading for the list, only renders if at least one commit matches |
| `message` | A regex pattern to match against the entire commit message |
| `subject` | A regex pattern to match against the commit subject only |
| `exclude` | A regex pattern to exclude from the list – useful for avoiding listing commits more than once |
| `flags` | [Regex flags](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions#advanced_searching_with_flags) for the patterns above: any of `i` (case-insensitive), `m`, `s`, and `u`. `message` and `exclude` always use `m` |

#### Replacing text

To insert links or other markup to PR titles and commit messages that appear in the log, use the `replaceText` option in your `package.json`:

```js
{
  "name": "my-awesome-package",
  "auto-changelog": {
    "replaceText": {
      "(ABC-\\d+)": "[`$1`](https://issues.apache.org/jira/browse/$1)"
    }
  }
}
```

Here, any time a pattern like `ABC-123` appears in your log, it will be replaced with a link to the relevant issue in Jira. Each pattern is applied using `string.replace(new RegExp(key, 'g'), value)`.

#### Handlebars setup file

The `--handlebars-setup` options allows you to point to a file to add custom Handlebars helpers, for use in custom templates using `--template`. Paths are relative to the directory in which you run `auto-changelog`. Because this file is loaded via `require`, it can only be passed on the command line;
setting `handlebarsSetup` in in-repo config makes `auto-changelog` refuse to run (see [Security](#security-and-untrusted-repositories)).

```js
auto-changelog --handlebars-setup setup.js --template custom-template.hbs

// setup.js
module.exports = function (Handlebars) {
  Handlebars.registerHelper('custom', function (context, options) {
    return 'custom helpers!'
  })
}

// custom-template.hbs
Now you can use {{custom}}
```

### FAQ

#### What’s a changelog?

See [keepachangelog.com](https://keepachangelog.com).

#### What does this do?

The command parses your git commit history and generates a changelog based on tagged versions, merged pull requests and closed issues. See a simple example in [this very repo](CHANGELOG.md).

#### Why do I need it?

Because keeping a changelog can be tedious and difficult to get right. If you don’t have the patience for a hand-crafted, bespoke changelog then this makes keeping one rather easy. It also can be [automated if you’re feeling extra lazy](#what-you-might-do-if-youre-clever).

[package-url]: https://npmjs.org/package/auto-changelog
[npm-version-svg]: https://versionbadg.es/cookpete/auto-changelog.svg
[npm-badge-png]: https://nodei.co/npm/auto-changelog.png?downloads=true&stars=true
[license-image]: https://img.shields.io/npm/l/auto-changelog.svg
[license-url]: LICENSE.md
[downloads-image]: https://img.shields.io/npm/dm/auto-changelog.svg
[downloads-url]: https://npm-stat.com/charts.html?package=auto-changelog
[codecov-image]: https://codecov.io/gh/cookpete/auto-changelog/branch/master/graphs/badge.svg
[codecov-url]: https://app.codecov.io/gh/cookpete/auto-changelog/
[actions-image]: https://img.shields.io/github/check-runs/cookpete/auto-changelog/master
[actions-url]: https://github.com/cookpete/auto-changelog/actions
