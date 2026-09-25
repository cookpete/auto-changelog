const { fetchTags } = require('./tags')
const { parseReleases } = require('./releases')
const { compileTemplate } = require('./template')
const getOptions = require('./options')
const {
  readFile,
  writeFile,
  fileExists,
  updateLog,
  formatBytes
} = require('./utils')

const PREPEND_TOKEN = '<!-- auto-changelog-above -->'

async function run (argv) {
  const options = await getOptions(argv)
  const log = string => options.stdout ? null : updateLog(string)
  log('Fetching tags…')
  const tags = await fetchTags(options)
  log(`${tags.length} version tags found…`)
  const onParsed = ({ title }) => log(`Fetched ${title}…`)
  const releases = await parseReleases(tags, options, onParsed)
  const changelog = await compileTemplate(releases, options)
  await write(changelog, options, log)
}

async function write (changelog, options, log) {
  if (options.stdout) {
    process.stdout.write(changelog)
    return
  }
  const bytes = formatBytes(Buffer.byteLength(changelog, 'utf8'))
  const existing = await fileExists(options.output) && await readFile(options.output)
  if (existing) {
    const index = options.prepend ? 0 : existing.indexOf(PREPEND_TOKEN)
    if (index !== -1) {
      const prepended = `${changelog}\n${existing.slice(index)}`
      await writeFile(options.output, prepended)
      log(`${bytes} prepended to ${options.output}\n`)
      return
    }
  }
  await writeFile(options.output, changelog)
  log(`${bytes} written to ${options.output}\n`)
}

module.exports = {
  run
}
