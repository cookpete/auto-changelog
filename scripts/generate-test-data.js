import { join } from 'path'
import { readFile, writeFile } from '../src/utils'
import { __get__ } from '../src/commits'
import { parseReleases } from '../src/releases'
import { compileTemplate } from '../src/template'

const parseCommits = __get__('parseCommits')

const DATA_DIR = join(__dirname, '..', 'test', 'data')

const remote = {
  hostname: 'github.com',
  url: 'https://github.com/user/repo'
}

const options = {
  unreleased: false,
  commitLimit: 3,
  backfillLimit: 3,
  tagPrefix: ''
}

async function run () {
  const gitLog = await readFile(join(DATA_DIR, 'git-log.txt'))
  const commits = parseCommits(gitLog, remote, options)
  const releases = parseReleases(commits, remote, null, options)
  await writeFile(join(DATA_DIR, 'commits.js'), 'export default ' + JSON.stringify(commits, null, 2))
  await writeFile(join(DATA_DIR, 'commits-no-remote.js'), 'export default ' + JSON.stringify(commitsWithoutLinks(commits), null, 2))
  await writeFile(join(DATA_DIR, 'releases.js'), 'export default ' + JSON.stringify(releases, null, 2))
  await writeFile(join(DATA_DIR, 'template-compact.md'), await compileTemplate('compact', { releases }))
  await writeFile(join(DATA_DIR, 'template-keepachangelog.md'), await compileTemplate('keepachangelog', { releases }))
  await writeFile(join(DATA_DIR, 'template-json.json'), await compileTemplate('json', { releases }))
}

function commitsWithoutLinks (commits) {
  return commits.map(commit => {
    const merge = commit.merge ? { ...commit.merge, href: null } : null
    const fixes = commit.fixes ? commit.fixes.map(fix => ({ ...fix, href: null })) : null
    return {
      ...commit,
      href: null,
      fixes,
      merge
    }
  })
}

run().catch(e => console.error(e))
