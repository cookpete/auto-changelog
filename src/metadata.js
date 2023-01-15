const merge = require('lodash/merge');
const { cmd, dotNotationToObject, readJson, niceDate } = require('./utils')

const DIVIDER = '=';

const getGitConfig = async () => {
    const config = (await cmd(`git config -l`))

    return config
        .trim()
        .split('\n')
        .reduce((acum, item) => {
            const [key, value] = item.split(DIVIDER)
            return merge(acum, dotNotationToObject(key, value))
        }, {})

}

const getMetadata = async (options) => {
    console.log("rree--->", options.metadata)

    if (!options.metadata) {
        return null
    }

    const PACKAGE_FILE = 'package.json'
    const config = await getGitConfig();

    const pkg = await readJson(PACKAGE_FILE)

    const allowed = ['name', 'version', 'description', 'changos', 'keywords']

    const meta = {};
    allowed.forEach(element => {
        meta[element] = pkg[element];
    });

    return JSON.parse(JSON.stringify({ now: niceDate(new Date()), ...meta, ...config }))

}

module.exports = {
    getMetadata
}
