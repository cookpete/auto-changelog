const readline = require('readline')
const fs = require('fs')
const { spawn } = require('child_process')

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function updateLog (string, clearLine = true) {
  if (clearLine) {
    readline.clearLine(process.stdout)
    readline.cursorTo(process.stdout, 0)
  }
  process.stdout.write(`auto-changelog: ${string}`)
}

function formatBytes (bytes) {
  return `${Math.max(1, Math.round(bytes / 1024))} kB`
}

// Simple util for calling a child process
function cmd (string, onProgress) {
  const [cmd, ...args] = string.trim().split(' ')
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args)
    let data = ''

    child.stdout.on('data', buffer => {
      data += buffer.toString()
      if (onProgress) {
        onProgress(data.length)
      }
    })
    child.stdout.on('end', () => resolve(data))
    child.on('error', reject)
  })
}

async function getGitVersion () {
  const output = await cmd('git --version')
  const match = output.match(/\d+\.\d+\.\d+/)
  return match ? match[0] : null
}

function niceDate (string) {
  const date = new Date(string)
  const day = date.getUTCDate()
  const month = MONTH_NAMES[date.getUTCMonth()]
  const year = date.getUTCFullYear()
  return `${day} ${month} ${year}`
}

function isLink (string) {
  return /^http/.test(string)
}

function parseLimit (limit) {
  return limit === 'false' ? false : parseInt(limit, 10)
}

function encodeHTML (string) {
  return string.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function replaceText (string, options) {
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

function readFile (path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf-8', createCallback(resolve, reject))
  })
}

function writeFile (path, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, data, createCallback(resolve, reject))
  })
}

function fileExists (path) {
  return new Promise(resolve => {
    fs.access(path, err => resolve(!err))
  })
}

async function readJson (path) {
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
  parseLimit,
  encodeHTML,
  replaceText,
  readFile,
  writeFile,
  fileExists,
  readJson
}
