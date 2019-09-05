import { describe, it } from 'mocha'
import { expect } from 'chai'
import Handlebars from 'handlebars'
import releases from './data/releases'

describe('matches helper', () => {
  const compileCommits = (matches) => Handlebars.compile(
    '{{#each releases}}\n' +
      '{{#each commits}}\n' +
        matches +
      '{{/each}}\n' +
    '{{/each}}',
    { noEscape: true }
  )

  it('matches on field value', () => {
    const matches =
      '{{#matches href "12c0624"}}\n' +
        '- {{message}}\n' +
      '{{/matches}}\n'
    const expected =
      '- Commit that fixes nothing with `backticks` and &lt;html&gt;\n'
    expect(compileCommits(matches)({ releases })).to.equal(expected)
  })

  it('matches with case insensitive flag', () => {
    const matches =
      '{{#matches author "pete" flags="i"}}\n' +
        '- {{shorthash}}\n' +
      '{{/matches}}\n'
    const expected =
      '- b0b3040\n' +
      '- 12c0624\n' +
      '- e9a43b2\n' +
      '- 158fdde\n'
    expect(compileCommits(matches)({ releases })).to.equal(expected)
  })

  it('provides non-matching conditional', () => {
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
    expect(compileCommits(matches)({ releases })).to.equal(expected)
  })

  it('matches on multiline content', () => {
    const multiReleases = [{
      commits: [
        {
          shorthash: 'c0f25d7',
          message: 'Hello\n\nWorld\n\nBREAKING CHANGE: mock break\n\nsome more text'
        }, {
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
    expect(compileCommits(matches)({ releases: multiReleases })).to.equal(expected)
  })
})
