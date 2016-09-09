import { spawn } from 'child_process'

// Simple util for calling a child process
export function cmd (string, options = {}) {
  const [ cmd, ...args ] = string.split(' ')
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, options)
    let data = ''

    child.stdout.on('data', buffer => { data += buffer.toString() })
    child.stdout.on('end', () => resolve(data))
    child.on('error', reject)
  })
}
