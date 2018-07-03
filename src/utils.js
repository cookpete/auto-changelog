import fs from 'fs'
import { spawn } from 'child_process'
import { URL } from 'url'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Simple util for calling a child process
export function cmd (string) {
  const [ cmd, ...args ] = string.split(' ')
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args)
    let data = ''

    child.stdout.on('data', buffer => { data += buffer.toString() })
    child.stdout.on('end', () => resolve(data))
    child.on('error', reject)
  })
}

export async function getGitVersion () {
  const output = await cmd('git --version')
  const match = output.match(/\d+\.\d+\.\d+/)
  return match ? match[0] : null
}

export function niceDate (string) {
  const date = new Date(string)
  const day = date.getUTCDate()
  const month = MONTH_NAMES[date.getUTCMonth()]
  const year = date.getUTCFullYear()
  return `${day} ${month} ${year}`
}

export function isLink (string) {
  return /^http/.test(string)
}

export function parseLimit (limit) {
  return limit === 'false' ? false : parseInt(limit, 10)
}

export function replaceText (string, options) {
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

export function readFile (path) {
  return new Promise((resolve, reject) => {
    const mypath = parseUrl(path)
    fs.readFile(mypath, 'utf-8', createCallback(resolve, reject))
  })
}

export function writeFile (path, data) {
  return new Promise((resolve, reject) => {
    const mypath = parseUrl(path)
    fs.writeFile(mypath, data, createCallback(resolve, reject))
  })
}

export function fileExists (path) {
  return new Promise(resolve => {
    const mypath = parseUrl(path)
    fs.access(mypath, err => resolve(!err))
  })
}

export function parseUrl (path) {
  let url
  try {
    url = new URL(path)
  } catch (e) {
    url = path
  }
  return url
}

export async function readJson (path) {
  const json = await readFile(path)
  return JSON.parse(json)
}
