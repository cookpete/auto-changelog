# auto-changelog

Command line tool for generating a changelog from git tags and commit history

[![Latest npm version](https://img.shields.io/npm/v/auto-changelog.svg)](https://www.npmjs.com/package/auto-changelog)
[![Build Status](https://img.shields.io/travis/CookPete/auto-changelog/master.svg)](https://travis-ci.org/CookPete/auto-changelog)
[![Greenkeeper](https://img.shields.io/badge/greenkeeper-enabled-brightgreen.svg)](https://greenkeeper.io)
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

  -o, --output [file]                 # output file, default: CHANGELOG.md
  -t, --template [template]           # specify template to use [compact, keepachangelog, json], default: compact
  -r, --remote [remote]               # specify git remote to use for links, default: origin
  -p, --package                       # use version from package.json as latest release
  -v, --latest-version [version]      # use specified version as latest release
  -u, --unreleased                    # include section for unreleased changes
  -l, --commit-limit [count]          # number of commits to display per release, default: 3
  -b, --backfill-limit [count]        # number of commits to backfill empty releases with, default: 3
  -i, --issue-url [url]               # override url for issues, use {id} for issue id
      --issue-pattern [regex]         # override regex pattern for issues in commit messages
      --breaking-pattern [regex]      # regex pattern for breaking change commits
      --merge-pattern [regex]         # add custom regex pattern for merge commits
      --ignore-commit-pattern [regex] # pattern to ignore when parsing commits
      --tag-pattern [regex]           # override regex pattern for release tags
      --tag-prefix [prefix]           # prefix used in version tags, default: v
      --starting-commit [hash]        # starting commit to use for changelog generation
      --sort-commits [property]       # sort commits by property [relevance, date], default: relevance
      --include-branch [branch]       # one or more branches to include commits from, comma separated
      --release-summary               # display tagged commit message body as release summary
      --handlebars-setup              # handlebars setup file
      --stdout                        # output changelog to stdout
  -V, --version                       # output the version number
  -h, --help                          # output usage information


# Write log to CHANGELOG.md in current directory
auto-changelog

# Write log to HISTORY.md
auto-changelog --output HISTORY.md

# Write log using keepachangelog template
auto-changelog --template keepachangelog

# Write log using custom handlebars template in current directory
auto-changelog --template my-custom-template.hbs

# Change rendered commit limit to 5
auto-changelog --commit-limit 5

# Disable the commit limit, rendering all commits
auto-changelog --commit-limit false
```

By default, changelogs will link to the appropriate pages for commits, issues and merge requests based on the `origin` remote of your repo. GitHub, GitLab, BitBucket and Azure DevOps are all supported. If you [close issues using keywords](https://help.github.com/articles/closing-issues-using-keywords) but refer to issues outside of your repository, you can use `--issue-url` to link somewhere else:

```bash
# Link all issues to redmine
auto-changelog --issue-url https://www.redmine.org/issues/{id}
```

Use `--tag-prefix [prefix]` if you prefix your version tags with a certain string:

```bash
# When all versions are tagged like my-package/1.2.3
auto-changelog --tag-prefix my-package/
```

By default, `auto-changelog` looks for valid semver tags to build a list of releases. If you are using another format (or want to include all tags), use `--tag-pattern [regex]`:

```bash
# When all versions are tagged like build-12345
auto-changelog --tag-pattern build-\d+

# Include any tag as a release
auto-changelog --tag-pattern .+
```

You can also set any option in `package.json` under the `auto-changelog` key, using camelCase options. Note that `includeBranch` should be an array here, not a comma separated list:

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
    "commitLimit": false,
    "includeBranch": [
      "release-v2",
      "release-v3"
    ]
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

### Requirements

`auto-changelog` is designed to be as flexible as possible, providing a clear changelog for any project. There are only two absolute requirements:

- You should be using git `1.7.2` or later
- All versions should be tagged using [semver](https://semver.org) tag names – this happens by default when using [`npm version`](https://docs.npmjs.com/cli/version)

There are some less strict requirements to improve your changelog:

- [Close issues using keywords](https://help.github.com/articles/closing-issues-using-keywords)
- Merge pull requests using the standard merge commit message for your platform

### What you might do if you’re clever

Install `auto-changelog` to dev dependencies:

```bash
npm install auto-changelog --save-dev
# or
yarn add auto-changelog --dev
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

Now every time you run [`npm version`](https://docs.npmjs.com/cli/version), the changelog will automatically update and be part of the version commit.

### Breaking changes

If you use a common pattern in your commit messages for breaking changes, use `--breaking-pattern` to highlight those commits as breaking changes in your changelog. Breaking change commits will always be listed as part of a release, regardless of any `--commit-limit` set.

```bash
auto-changelog --breaking-pattern "BREAKING CHANGE:"
```

### Custom templates

If you aren’t happy with the default templates or want to tweak something, you can point to a [handlebars](http://handlebarsjs.com) template in your local repo. Check out the [existing templates](templates) to see what is possible.

Save `changelog-template.hbs` somewhere in your repo:

```hbs
### Changelog
My custom changelog template. Don’t worry about indentation here; it is automatically removed from the output.

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
    - Commits have a {{shorthash}}, a {{subject}} and a {{href}}, amongst other things.
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

To see exactly what data is passed in to the templates, you can generate a JSON version of the changelog:

```bash
auto-changelog --template json --output changelog-data.json
```

### `commit-list` helper

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

| Option    | Description |
| --------- | ----------- |
| `heading` | A heading for the list, only renders if at least one commit matches |
| `message` | A regex pattern to match against the entire commit message |
| `subject` | A regex pattern to match against the commit subject only |
| `exclude` | A regex pattern to exclude from the list – useful for avoiding listing commits more than once |

### Custom issue patterns

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

### Replacing text

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

### Handlebars setup file

The `--handlebars-setup` options allows you to point to a file to add custom Handlebars helpers, for use in custom templates using `--template`. Paths are relative to the directory in which you run `auto-changelog`.

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

### Migrating to `1.x`

If you are upgrading from `0.x`, the same options are still supported out of the box. Nothing will break, but your changelog may look slightly different:

- The default template is now `compact`
  - If you still want to use the [`keepachangelog`](http://keepachangelog.com) format, use `--template keepachangelog`
- Templates now use `-` instead of `*` for lists
- Up to 3 commits are now shown per release by default, use `--commit-limit` to change this
- Unreleased changes are no longer listed by default, use `--unreleased` to include them
- [GitLab](https://gitlab.com) and [BitBucket](https://bitbucket.org) are now fully supported

If anything isn’t working correctly, [open an issue](https://github.com/CookPete/auto-changelog/issues).

### FAQ

#### What’s a changelog?

See [keepachangelog.com](http://keepachangelog.com).

#### What does this do?

The command parses your git commit history and generates a changelog based on tagged versions, merged pull requests and closed issues. See a simple example in [this very repo](CHANGELOG.md).

#### Why do I need it?

Because keeping a changelog can be tedious and difficult to get right. If you don’t have the patience for a hand-crafted, bespoke changelog then this makes keeping one rather easy. It also can be [automated if you’re feeling extra lazy](#what-you-might-do-if-youre-clever).
