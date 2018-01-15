import parseRepoURL from 'parse-github-url'

import { cmd } from './utils'

export async function fetchOrigin (remote) {
  const originURL = await cmd(`git config --get remote.${remote}.url`)
  if (!originURL) {
    console.warn(`Warning: Git remote ${remote} was not found`)
    console.warn(`Warning: Changelog will not contain links to commits, issues, or PRs`)
    return null
  }
  const origin = parseRepoURL(originURL)
  const protocol = origin.protocol === 'http:' ? 'http:' : 'https:'
  const hostname = origin.hostname || origin.host
  return {
    hostname,
    url: `${protocol}//${hostname}/${origin.repo}`
  }
}
