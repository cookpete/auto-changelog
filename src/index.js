#!/usr/bin/env node

import 'core-js/stable'
import run from './run'

run(process.argv)
  .catch(error => {
    console.log('\n')
    console.error(error)
    process.exit(1)
  })
