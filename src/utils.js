const readline = require('readline')
const fs = require('fs')
const { spawn } = require('child_process')

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

// Simple util for calling a child process
const cmd = (string, onProgress) => {
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
  parseLimit,
  encodeHTML,
  replaceText,
  readFile,
  writeFile,
  fileExists,
  readJson
}
