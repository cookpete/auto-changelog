import { describe, it } from 'mocha'
import { expect } from 'chai'

import releases from './data/releases'
import changelogDefault from './data/changelog-default'
import changelogCompact from './data/changelog-compact'
import templates from '../src/templates'

const origin = 'https://github.com/user/repo'

describe('Template', () => {
  it('renders using default template', () => {
    const Template = templates.default
    const result = new Template(origin).render(releases)
    expect(result).to.equal(changelogDefault)
  })

  it('renders using compact template', () => {
    const Template = templates.compact
    const result = new Template(origin).render(releases)
    expect(result).to.equal(changelogCompact)
  })
})
