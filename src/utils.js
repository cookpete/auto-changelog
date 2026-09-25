const readline = require('readline')
const fs = require('fs')
const cmd = require('./cmd')

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const updateLog = (string, clearLine = true) => {
  if (clearLine) {
    readline.clearLine(process.stdout)
    readline.cursorTo(process.stdout, 0)
  }
  process.stdout.write(`auto-changelog: ${string}`)
}

const formatBytes = (bytes) => {
  return `${Math.max(1, Math.round(bytes / 1024))} kB`
}

const getGitVersion = async () => {
  const output = await cmd('git --version')
  const match = output.match(/\d+\.\d+\.\d+/)
  return match ? match[0] : null
}

const niceDate = (string) => {
  const date = new Date(string)
  const day = date.getUTCDate()
  const month = MONTH_NAMES[date.getUTCMonth()]
  const year = date.getUTCFullYear()
  return `${day} ${month} ${year}`
}

const isLink = (string) => {
  return /^http/.test(string)
}

function isURL (string) {
  return /^https?:\/\/.+/.test(string)
}

const parseLimit = (limit) => {
  return limit === 'false' ? false : parseInt(limit, 10)
}

const encodeHTML = (string) => {
  return string.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const replaceText = (string, options) => {
  if (!options.replaceText) {
    return string
  }
  return Object.keys(options.replaceText).reduce((string, pattern) => {
    return string.replace(new RegExp(pattern, 'g'), options.replaceText[pattern])
  }, string)
}

const createCallback = (resolve, reject) => (err, data) => {
  if (err) reject(err)
  else resolve(data)
}

const readFile = (path) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf-8', createCallback(resolve, reject))
  })
}

const writeFile = (path, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, data, createCallback(resolve, reject))
  })
}

const fileExists = (path) => {
  return new Promise(resolve => {
    fs.access(path, err => resolve(!err))
  })
}

const readJson = async (path) => {
  if (await fileExists(path) === false) {
    return null
  }
  return JSON.parse(await readFile(path))
}

module.exports = {
  updateLog,
  formatBytes,
  cmd,
  getGitVersion,
  niceDate,
  isLink,
  isURL,
  parseLimit,
  encodeHTML,
  replaceText,
  readFile,
  writeFile,
  fileExists,
  readJson
}
