import { spawn } from 'child_process'
import moment from 'moment'

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

export function niceDate (string) {
  return moment(string).format('D MMMM YYYY')
}

export function removeIndentation (string) {
  return string
    .replace(/\n +/g, '\n')
    .replace(/^ +/, '')
}

export function isLink (string) {
  return /^http/.test(string)
}

export function parseLimit (limit) {
  return limit === 'false' ? false : parseInt(limit, 10)
}
