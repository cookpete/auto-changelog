import { readFile, writeFile } from 'fs-extra'
import { join } from 'path'

import { __get__ } from '../src/commits'
import { parseReleases } from '../src/releases'
import { compileTemplate } from '../src/template'

const parseCommits = __get__('parseCommits')

const DATA_DIR = join(__dirname, '..', 'test', 'data')

const origin = {
  hostname: 'github.com',
  url: 'https://github.com/user/repo'
}

async function run () {
  const gitLog = await readFile(join(DATA_DIR, 'git-log.txt'), 'utf-8')
  const commits = parseCommits(gitLog, origin)
  const releases = parseReleases(commits, origin, null, false)
  await writeFile(join(DATA_DIR, 'commits.js'), 'export default ' + JSON.stringify(commits, null, 2))
  await writeFile(join(DATA_DIR, 'releases.js'), 'export default ' + JSON.stringify(releases, null, 2))
  await writeFile(join(DATA_DIR, 'template-compact.md'), await compileTemplate('compact', { releases }))
  await writeFile(join(DATA_DIR, 'template-keepachangelog.md'), await compileTemplate('keepachangelog', { releases }))
  await writeFile(join(DATA_DIR, 'template-json.md'), await compileTemplate('json', { releases }))
}

run().catch(e => console.error(e))
