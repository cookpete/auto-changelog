#!/usr/bin/env node

import 'babel-polyfill'
import run from './run'

run(process.argv)
  .then(message => {
    console.log(message)
    process.exit(0)
  })
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
