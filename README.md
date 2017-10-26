auto-changelog
==============

[![Greenkeeper badge](https://badges.greenkeeper.io/CookPete/auto-changelog.svg)](https://greenkeeper.io/)

Command line tool for generating a changelog from git tags and commit history

[![Latest npm version](https://img.shields.io/npm/v/auto-changelog.svg)](https://www.npmjs.com/package/auto-changelog)
[![Build Status](https://img.shields.io/travis/CookPete/auto-changelog.svg)](https://travis-ci.org/CookPete/auto-changelog)
[![Dependency Status](https://img.shields.io/david/CookPete/auto-changelog.svg)](https://david-dm.org/CookPete/auto-changelog)
[![devDependency Status](https://img.shields.io/david/dev/CookPete/auto-changelog.svg)](https://david-dm.org/CookPete/auto-changelog#info=devDependencies)
[![Test Coverage](https://img.shields.io/codecov/c/github/cookpete/auto-changelog.svg)](https://codecov.io/gh/CookPete/auto-changelog)


### Installation

```bash
npm install -g auto-changelog
```


### Usage

Just run in a local git repo. `git log` is run behind the scenes in order to parse commits.

```bash
auto-changelog # Writes log to CHANGELOG.md in current directory
```

Specify an output file with `-o` or `--output`.

```bash
auto-changelog --output HISTORY.md # Writes log to HISTORY.md
```

Specify a theme with `-t` or `--template`.

```bash
auto-changelog --template compact # Writes log using compact template
```

#### What you might do if you’re clever

- `npm install auto-changelog --save-dev`
- Add `auto-changelog --package; git add CHANGELOG.md` to the `version` scripts in your `package.json`:

```json
{
  "name": "package",
  "devDependencies": {
    "auto-changelog": "*"
  },
  "scripts": {
    "version": "auto-changelog --package; git add CHANGELOG.md"
  }
}
```

Using `--package` or `-p` uses the `version` from `package.json` as the latest release, so that _all commits between the previous release and now_ become part of that release. Essentially anything that would normally be parsed as `Unreleased` will now come under the `version` from `package.json`

Now every time you run [`npm version`](https://docs.npmjs.com/cli/version), the changelog will automatically update and be part of the version commit.


### FAQ

#### What’s a changelog?
See [keep-a-changelog](https://github.com/olivierlacan/keep-a-changelog#whats-a-change-log).

#### What does this do?
The command parses a git commit history and generates a changelog based on tagged versions, merged pull requests and closed issues. The default output attempts to follow the schema outlined by [keep-a-changelog](https://github.com/olivierlacan/keep-a-changelog). See a simple example in [this very repo](https://github.com/CookPete/auto-changelog/blob/master/CHANGELOG.md).

#### Why do I need it?
Because keeping a changelog can be tedious and difficult to get right. If you don’t have the patience for a hand-crafted, bespoke changelog then this makes keeping one rather easy. It also can be automated if you’re feeling extra lazy (see [What you might do if you’re clever](#what-you-might-do-if-youre-clever) above).
