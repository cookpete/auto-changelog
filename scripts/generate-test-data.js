import { join } from 'path'
import { readFile, writeFile } from '../src/utils'
import { __get__ } from '../src/commits'
import { parseReleases } from '../src/releases'
import { compileTemplate } from '../src/template'
import remotes from '../test/data/remotes'

const parseCommits = __get__('parseCommits')

const DATA_DIR = join(__dirname, '..', 'test', 'data')

const options = {
  unreleased: false,
  commitLimit: 3,
  backfillLimit: 3,
  tagPrefix: ''
}

function writeObject (filename, object) {
  return writeFile(join(DATA_DIR, filename), `export default ${JSON.stringify(object, null, 2)}\n`)
}

async function writeTemplate (filename, template, releases) {
  return writeFile(join(DATA_DIR, filename), await compileTemplate({ template }, { releases }))
}

async function run () {
  const gitLog = await readFile(join(DATA_DIR, 'git-log.txt'))
  const commits = parseCommits(gitLog, remotes.github, options)
  const releases = parseReleases(commits, remotes.github, null, options)
  const commitsNoRemote = parseCommits(gitLog, remotes.null, options)
  const releasesNoRemote = parseReleases(commitsNoRemote, remotes.null, null, options)
  await writeObject('commits.js', commits)
  await writeObject('commits-no-remote.js', commitsNoRemote)
  await writeObject('releases.js', releases)
  await writeTemplate('template-compact.md', 'compact', releases)
  await writeTemplate('template-keepachangelog.md', 'keepachangelog', releases)
  await writeTemplate('template-json.json', 'json', releases)
  await writeTemplate('template-compact-no-remote.md', 'compact', releasesNoRemote)
}

run().catch(e => console.error(e))
