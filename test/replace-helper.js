import { describe, it } from 'mocha'
import { expect } from 'chai'
import Handlebars from 'handlebars'
import releases from './data/releases'

describe('replace helper', () => {
  it('should replace -test to empty', () => {
    const compileCommits = (matches) => Handlebars.compile(
      '{{#replace "-test" "" }}\n' +
          matches +
      '{{/replace}}'
    )

    const matches =
      '### v3.4.9-test'
    const expected =
      '### v3.4.9'
    expect(compileCommits(matches)({ releases })).to.equal(expected)
  })

  it('should regexp replace without flags', () => {
    const compileCommits = (matches) => Handlebars.compile(
      `{{#replace "/v.+/" "vAwesome" }}\n` +
          matches +
      '{{/replace}}'
    )

    const matches =
      '### v3.4.9-test'
    const expected =
      '### vAwesome'
    expect(compileCommits(matches)({ releases })).to.equal(expected)
  })

  it('should regexp replace with flag g', () => {
    const compileCommits = (matches) => Handlebars.compile(
      `{{#replace "/5/" "6" flags="g" }}\n` +
          matches +
      '{{/replace}}'
    )

    const matches =
      '### 555551'
    const expected =
      '### 666661'
    expect(compileCommits(matches)({ releases })).to.equal(expected)
  })
})
