#!/usr/bin/env node

import 'babel-polyfill'
import run from './run'

run().catch(e => console.error(e))
