import { join } from 'path'
import { readFile, pathExists } from 'fs-extra'
import Handlebars from 'handlebars'

import { removeIndentation } from './utils'

const TEMPLATES_DIR = join(__dirname, '..', 'templates')

Handlebars.registerHelper('json', function (object) {
  return new Handlebars.SafeString(JSON.stringify(object, null, 2))
})

Handlebars.registerHelper('notcontains', function(collection, item, options) {
  // string check
	if(typeof collection === 'string'){
		if( collection.search(item) < 0){
			return options.fn(this);
		} else {
			return options.inverse(this);
		}
	}
  
	// "collection" check (objects & arrays)
	for (var prop in collection) {
		if (collection.hasOwnProperty(prop)){
			if(collection[prop] !== item) return options.fn(this);
		}
	}

	return options.inverse(this);
});

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
