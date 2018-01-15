import parseRepoURL from 'parse-github-url'

import { cmd } from './utils'

export async function fetchRemote (name) {
  const remoteURL = await cmd(`git config --get remote.${name}.url`)
  if (!remoteURL) {
    console.warn(`Warning: Git remote ${name} was not found`)
    console.warn(`Warning: Changelog will not contain links to commits, issues, or PRs`)
    return null
  }
  const remote = parseRepoURL(remoteURL)
  const protocol = remote.protocol === 'http:' ? 'http:' : 'https:'
  const hostname = remote.hostname || remote.host
  return {
    hostname,
    url: `${protocol}//${hostname}/${remote.repo}`
  }
}
