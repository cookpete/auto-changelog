const parseRepoURL = require('parse-github-url')
const { cmd } = require('./utils')

async function fetchRemote (options) {
  const remoteURL = await cmd(`git config --get remote.${options.remote}.url`)
  return getRemote(remoteURL, options)
}

function getRemote (remoteURL, options = {}) {
  const overrides = getOverrides(options)
  if (!remoteURL) {
    // No point warning if everything is overridden
    if (Object.keys(overrides).length !== 4) {
      console.warn(`Warning: Git remote ${options.remote} was not found`)
    }
    return {
      getCommitLink: () => null,
      getIssueLink: () => null,
      getMergeLink: () => null,
      getCompareLink: () => null,
      ...overrides
    }
  }
  const remote = parseRepoURL(remoteURL)
  const protocol = remote.protocol === 'http:' ? 'http:' : 'https:'
  const hostname = remote.hostname || remote.host

  const IS_BITBUCKET = /bitbucket/.test(hostname)
  const IS_GITLAB = /gitlab/.test(hostname)
  const IS_GITLAB_SUBGROUP = /\.git$/.test(remote.branch)
  const IS_AZURE = /dev\.azure/.test(hostname)
  const IS_VISUAL_STUDIO = /visualstudio/.test(hostname)

  if (IS_BITBUCKET) {
    const url = `${protocol}//${hostname}/${remote.repo}`
    return {
      getCommitLink: id => `${url}/commits/${id}`,
      getIssueLink: id => `${url}/issues/${id}`,
      getMergeLink: id => `${url}/pull-requests/${id}`,
      getCompareLink: (from, to) => `${url}/compare/${to}..${from}`,
      ...overrides
    }
  }

  if (IS_GITLAB) {
    const url = IS_GITLAB_SUBGROUP
      ? `${protocol}//${hostname}/${remote.repo}/${remote.branch.replace(/\.git$/, '')}`
      : `${protocol}//${hostname}/${remote.repo}`
    return {
      getCommitLink: id => `${url}/commit/${id}`,
      getIssueLink: id => `${url}/issues/${id}`,
      getMergeLink: id => `${url}/merge_requests/${id}`,
      getCompareLink: (from, to) => `${url}/compare/${from}...${to}`,
      ...overrides
    }
  }

  if (IS_AZURE || IS_VISUAL_STUDIO) {
    const url = IS_AZURE
      ? `${protocol}//${hostname}/${remote.path}`
      : `${protocol}//${hostname}/${remote.repo}/${remote.branch}`
    const project = IS_AZURE
      ? `${protocol}//${hostname}/${remote.repo}`
      : `${protocol}//${hostname}/${remote.owner}`
    return {
      getCommitLink: id => `${url}/commit/${id}`,
      getIssueLink: id => `${project}/_workitems/edit/${id}`,
      getMergeLink: id => `${url}/pullrequest/${id}`,
      getCompareLink: (from, to) => `${url}/branches?baseVersion=GT${to}&targetVersion=GT${from}&_a=commits`,
      ...overrides
    }
  }

  const url = `${protocol}//${hostname}/${remote.repo}`
  return {
    getCommitLink: id => `${url}/commit/${id}`,
    getIssueLink: id => `${url}/issues/${id}`,
    getMergeLink: id => `${url}/pull/${id}`,
    getCompareLink: (from, to) => `${url}/compare/${from}...${to}`,
    ...overrides
  }
}

function getOverrides ({ commitUrl, issueUrl, mergeUrl, compareUrl }) {
  const overrides = {}
  if (commitUrl) overrides.getCommitLink = id => commitUrl.replace('{id}', id)
  if (issueUrl) overrides.getIssueLink = id => issueUrl.replace('{id}', id)
  if (mergeUrl) overrides.getMergeLink = id => mergeUrl.replace('{id}', id)
  if (compareUrl) overrides.getCompareLink = (from, to) => compareUrl.replace('{from}', from).replace('{to}', to)
  return overrides
}

module.exports = {
  fetchRemote,
  getRemote
}
