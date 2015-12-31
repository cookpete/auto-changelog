import { describe, it } from 'mocha'
import { expect } from 'chai'

import releases from './data/releases'
import changelog from './data/changelog'
import Template from '../src/templates/Base'

describe('Template', () => {
  it('renders a log', () => {
    const result = new Template('https://github.com/user/repo').render(releases)
    expect(result).to.equal(changelog)
  })
})
