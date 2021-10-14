# auto-changelog

Command line tool for generating a changelog from git tags and commit history. Used by [Modernizr](https://modernizr.com), [Netlify](https://netlify.com), and [Velocity.js](http://velocityjs.org).

[![Latest npm version](https://img.shields.io/npm/v/auto-changelog.svg)](https://www.npmjs.com/package/auto-changelog)
[![Build Status](https://img.shields.io/travis/CookPete/auto-changelog/master.svg)](https://travis-ci.org/CookPete/auto-changelog)
[![Test Coverage](https://img.shields.io/codecov/c/github/cookpete/auto-changelog.svg)](https://codecov.io/gh/CookPete/auto-changelog)

### Installation

```bash
npm install -g auto-changelog
```

### Usage

Simply run `auto-changelog` in the root folder of a git repository. `git log` is run behind the scenes in order to parse the commit history.

```bash
Usage: auto-changelog [options]

Options:

  -o, --output [file]                 # output file (default: CHANGELOG.md)
  -c, --config [file]                 # config file location (default: .auto-changelog)
      --extends [config]              # extend a JSON config file, by relative path or package path
  -t, --template [template]           # specify template to use [compact, keepachangelog, json] (default: compact)
  -r, --remote [remote]               # specify git remote to use for links (default: origin)
  -p, --package                       # use version from package.json as latest release
      --package-file [file]           # use version from the specified file as latest release
      --latest-version [version]      # use specified version as latest release
      --hide-credit                   # hide auto-changelog credit
      --handlebars-setup [file]       # handlebars setup file
      --keep-indentation              # keep indentation from the template in the output
      --prepend                       # prepend changelog to output file
      --stdout                        # output changelog to stdout
      --plugins [name]                # use plugins to augment commit/merge/release information; repeat for each plugin
      --unsafe-config                 # trust unsafe options from in-repo config (see Security)
      --version                       # output the version number
      --help                          # output usage information

Releases:

  -u, --unreleased                    # include section for unreleased changes
      --tag-pattern [regex]           # override regex pattern for version tags
      --tag-prefix [prefix]           # prefix used in version tags
      --tag-parser-pattern [regex]    # pattern used to capture values in tags for replacement
      --tag-parser-replacement [string] # replaces captures supplied in the --tag-parser-pattern option to create valid semver tags
      --strip-tag-prefix              # strip the tag prefix from release titles (default: on for a detected monorepo package)
      --no-strip-tag-prefix           # keep the tag prefix in release titles
      --autodetect-monorepo-disabled  # disable monorepo autodetection
      --no-autodetect-monorepo-disabled # enable monorepo autodetection (default)
      --starting-version [tag]        # specify earliest version to include in changelog
      --starting-date [yyyy-mm-dd]    # specify earliest release date to include in changelog (filters releases by tag date, not commits)
      --ending-version [tag]          # specify latest version to include in changelog
      --release-summary               # display tagged commit message body as release summary
      --unreleased-only               # only output unreleased changes
      --hide-empty-releases           # hide empty releases
      --append-git-tag [string]       # string to append to git tag command

Commits:

  -l, --commit-limit [count]          # number of commits to display per release (default: 3)
      --no-commit-limit               # display all commits for every release
  -b, --backfill-limit [count]        # number of commits to backfill empty releases with (default: 3)
      --no-backfill-limit             # backfill empty releases with all commits
      --issue-pattern [regex]         # override regex pattern for issues in commit messages
      --breaking-pattern [regex]      # regex pattern for breaking change commits
      --merge-pattern [regex]         # add custom regex pattern for merge commits
      --commit-pattern [regex]        # pattern to include when parsing commits
      --ignore-commit-pattern [regex] # pattern to ignore when parsing commits, matched against commit subjects and merged pull request titles
      --sort-commits [property]       # sort commits by property [relevance, date, date-desc, subject, subject-desc] (default: relevance)
      --append-git-log [string]       # string to append to git log command

Links:

      --commit-url [url]              # override url for commits, use {id} for commit id
      --issue-url [url]               # override url for issues, use {id} for issue id
      --merge-url [url]               # override url for merges, use {id} for merge id
      --compare-url [url]             # override url for compares, use {from} and {to} for tags


# Write log to CHANGELOG.md in current directory
auto-changelog

# Write log to HISTORY.md using keepachangelog template
auto-changelog --output HISTORY.md --template keepachangelog

# Disable the commit limit, rendering all commits for every release
auto-changelog --no-commit-limit

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
- **Node API**: `require('auto-changelog')` no longer runs the CLI; call the exported [`run`](#node-api) instead.
- **`--package <file>`**: `--package` no longer takes a file; use `--package-file <file>`. In a config file, a file path in `package` is now an error; use `packageFile`.
- **`--commit-limit false`, `--backfill-limit false`**: these now take only an integer; use `--no-commit-limit` or `--no-backfill-limit`. `false` still works in a config file.
- **`--plugins a b`**: repeat the flag for each plugin, as in `--plugins a --plugins b`. A `plugins` array in a config file is unchanged.
- **`--append-git-log`, `--append-git-tag`**: attach a value starting with a dash with `=`, as in `--append-git-log=--first-parent`.
- **Short flags**: `-v`, `-i`, `-h`, and `-V` are gone; use `--latest-version`, `--issue-url`, `--help`, and `--version`.
- **`--sort-commits`**: an unsupported value is now an error, rather than sorting by relevance.

What may look different:

- **Monorepos**: [monorepo autodetection](#monorepos) is now on by default, so a detected package gets its tag prefix from its `name` (unless one is configured), and release titles without it. Set `autodetectMonorepoDisabled` to `true` to keep the v2 behavior.
- **Progress messages** go to stderr, so stdout carries only the changelog.
- **`--version`** prints the version with a `v` prefix, like `v3.0.0`.
- **`--ignore-commit-pattern`** also matches merged pull request titles, so it can hide merges as well as commits.

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

In every case, "rejected" means `auto-changelog` stops with an error - it never silently drops the value or produces a changelog from sanitized config. If you fully trust the repository you are running against and want to honor its config as-is, pass `--unsafe-config`. **Do not use `--unsafe-config` with repositories you do not control.**

#### Tag prefixes

Use `--tag-prefix [prefix]` if you prefix your version tags with a certain string:

```bash
# When all versions are tagged like my-package/1.2.3
auto-changelog --tag-prefix my-package/
```

Tags with a leading `v`, like `v1.2.3`, are already valid version tags, so they do not need `--tag-prefix v`.

By default, release titles show the full tag, like `my-package/1.2.3`. Pass `--strip-tag-prefix` to show only the version, like `1.2.3`; compare links still use the full tags.

#### Monorepos

In a monorepo, each package's version tags are typically prefixed with the package name, like `my-package@1.2.3`. By default, `auto-changelog` detects a monorepo package - by a `repository.directory` field in `package.json`, or an ancestor `package.json` within the same git repository declaring npm `workspaces` - and, for a detected package:

- derives the [tag prefix](#tag-prefixes) from the `name` in `package.json` (so you don't have to set `--tag-prefix` for every package), unless one is already configured, and
- strips that prefix from the release titles in the changelog (so headings read `## [1.2.3]` rather than `## [my-package@1.2.3]`), while still using the full tags for the compare links, unless [`--no-strip-tag-prefix`](#tag-prefixes) (or `"stripTagPrefix": false`) is set.

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
auto-changelog --tag-pattern build-\d+

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

#### Breaking changes

If you use a common pattern in your commit messages for breaking changes, use `--breaking-pattern` to highlight those commits as breaking changes in your changelog. Breaking change commits will always be listed as part of a release, regardless of any `--commit-limit` set.

```bash
auto-changelog --breaking-pattern "BREAKING CHANGE:"
```

#### Custom issue patterns

By default, `auto-changelog` will parse [GitHub-style issue fixes](https://help.github.com/articles/closing-issues-using-keywords/) in your commit messages. If you use Jira or an alternative pattern in your commits to reference issues, you can pass in a custom regular expression to `--issue-pattern` along with `--issue-url`:

```bash
# Parse Jira-style issues in your commit messages, like PROJECT-418
auto-changelog --issue-pattern [A-Z]+-\d+ --issue-url https://issues.apache.org/jira/browse/{id}
```

Or, in your `package.json`:

```js
{
  "name": "my-awesome-package",
  "auto-changelog": {
    "issueUrl": "https://issues.apache.org/jira/browse/{id}",
    "issuePattern": "[A-Z]+-\d+"
  }
}
```

If you use a certain pattern before or after the issue number, like `fixes {id}`, just use a capturing group:

```bash
# "This commit fixes ISSUE-123" will now parse ISSUE-123 as an issue fix
auto-changelog --issue-pattern "[Ff]ixes ([A-Z]+-\d+)"
```

#### How releases are built

Each release covers the commits since the previous version tag (`git log <previous tag>..<tag>`), and lists them in three groups:

- **Merges**: merged pull requests, detected from GitHub merge and squash merge commits (a subject ending in `(#123)`), BitBucket and GitLab merge commits, and any `--merge-pattern`.
- **Fixes**: commits whose message closes an issue, like `Fixes #123` or `Closes https://github.com/user/repo/issues/123`, or matches `--issue-pattern`.
- **Commits**: everything else, except version commits (like `1.2.3`), `Merge branch` commits, and a merged pull request's own commits that have the same subject as its title. When the log may be missing commits (with `--commit-pattern`, `--ignore-commit-pattern`, `--append-git-log`, or a `processCommits` plugin), and a pull request branched off before the previous release, any commit with its title is left out, since it can't be ruled out as one of the pull request's own.

All merges and fixes are listed, but **commits are limited** to the 3 most relevant (the most lines changed) per release, or `--commit-limit`; a release with no merges or fixes uses `--backfill-limit` instead. Use `--no-commit-limit` to list every commit, and `--sort-commits` to change the order. [Breaking changes](#breaking-changes) are always listed, first.

Commit message conventions aren't special: a `feat:` or `fix:` prefix is just part of the subject, so to group commits by type, use the [`commit-list` helper](#commit-list-helper) in a custom template. To leave commits out entirely, use `--ignore-commit-pattern`, or `--commit-pattern` to only include matching commits.

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
