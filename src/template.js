import { join } from 'path'
import { readFile, pathExists } from 'fs-extra'
import Handlebars from 'handlebars'

import { removeIndentation } from './utils'

const TEMPLATES_DIR = join(__dirname, '..', 'templates')

Handlebars.registerHelper('json', function (object) {
  return new Handlebars.SafeString(JSON.stringify(object, null, 2))
})

Handlebars.registerHelper('commit-list', function (context, options) {
  if (!context || context.length === 0) {
    return ''
  }

  const list = context
    .filter(commit => {
      if (options.hash.exclude) {
        const pattern = new RegExp(options.hash.exclude, 'm')
        if (pattern.test(commit.message)) {
          return false
        }
      }
      if (options.hash.message) {
        const pattern = new RegExp(options.hash.message, 'm')
        return pattern.test(commit.message)
      }
      if (options.hash.subject) {
        const pattern = new RegExp(options.hash.subject)
        return pattern.test(commit.subject)
      }
      return true
    })
    .map(item => options.fn(item))
    .join('')

  if (!list) {
    return ''
  }

  return `${options.hash.heading}\n${list}`
})

async function getTemplate (template) {
  if (await pathExists(template)) {
    return readFile(template, 'utf-8')
  }
  const path = join(TEMPLATES_DIR, template + '.hbs')
  if (await pathExists(path) === false) {
    throw new Error(`Template '${template}' was not found`)
  }
  return readFile(path, 'utf-8')
}

export async function compileTemplate (template, data) {
  const compile = Handlebars.compile(await getTemplate(template))
  if (template === 'json') {
    return compile(data)
  }
  return removeIndentation(compile(data))
}
