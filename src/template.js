const { join } = require('path')
const Handlebars = require('handlebars')
const fetch = require('node-fetch')
const { readFile, fileExists } = require('./utils')

const TEMPLATES_DIR = join(__dirname, '..', 'templates')
const MATCH_URL = /^https?:\/\/.+/
const COMPILE_OPTIONS = {
  noEscape: true
}

Handlebars.registerHelper('json', function (object) {
  return new Handlebars.SafeString(JSON.stringify(object, null, 2))
})

Handlebars.registerHelper('commit-list', function (context, options) {
  if (!context || context.length === 0) {
    return ''
  }

  const list = context
    .filter(item => {
      const commit = item.commit || item
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

  return `${options.hash.heading}\n\n${list}`
})

Handlebars.registerHelper('matches', function (val, pattern, options) {
  const r = new RegExp(pattern, options.hash.flags || '')
  return r.test(val) ? options.fn(this) : options.inverse(this)
})

async function getTemplate (template) {
  if (MATCH_URL.test(template)) {
    const response = await fetch(template)
    return response.text()
  }
  if (await fileExists(template)) {
    return readFile(template)
  }
  const path = join(TEMPLATES_DIR, template + '.hbs')
  if (await fileExists(path) === false) {
    throw new Error(`Template '${template}' was not found`)
  }
  return readFile(path)
}

function cleanTemplate (template) {
  return template
    // Remove indentation
    .replace(/\n +/g, '\n')
    .replace(/^ +/, '')
    // Fix multiple blank lines
    .replace(/\n\n\n+/g, '\n\n')
    .replace(/\n\n$/, '\n')
}

async function compileTemplate ({ template, handlebarsSetup }, data) {
  if (handlebarsSetup) {
    const setup = require(join(process.cwd(), handlebarsSetup))
    if (typeof setup === 'function') {
      setup(Handlebars)
    }
  }
  const compile = Handlebars.compile(await getTemplate(template), COMPILE_OPTIONS)
  if (template === 'json') {
    return compile(data)
  }
  return cleanTemplate(compile(data))
}

module.exports = {
  compileTemplate
}
