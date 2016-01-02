// Simple, slimline template based on https://github.com/rackt/react-router/blob/master/CHANGES.md

import Default from './Default'

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default class Compact extends Default {
  mergesTitle = null
  fixesTitle = null
  commitsTitle = null

  listSpacing = '\n'

  renderReleaseHeading = (release, previousRelease) => {
    const title = this.renderReleaseTitle(release, previousRelease)
    const date = release.tag ? `\n> ${this.formatDate(release.date)}` : ''
    return `#### ${title}${date}\n`
  }

  formatDate = (string) => {
    const date = new Date(string)
    const day = date.getDate()
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  }
}
