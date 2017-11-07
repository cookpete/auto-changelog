import parseRepoURL from 'parse-github-url'

import { cmd } from './utils'

export async function fetchOrigin (remote) {
  const originURL = await cmd(`git config --get remote.${remote}.url`)
  if (!originURL) {
    throw new Error(`Git remote ${remote} was not found`)
  }
  const origin = parseRepoURL(originURL)
  const protocol = origin.protocol === 'http:' ? 'http:' : 'https:'
  const host = origin.hostname || origin.host
  return {
    ...origin,
    repoURL: `${protocol}//${host}/${origin.repo}`
  }
}
