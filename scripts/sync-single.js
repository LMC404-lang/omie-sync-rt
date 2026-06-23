#!/usr/bin/env node
'use strict';

require('dotenv').config();
const { runSync } = require('../src/sync');
const { getEntities } = require('../src/entities');

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const full = process.argv.includes('--full');

if (!args.length) {
  const all = getEntities().map((e) => e.name);
  console.error('Usage: node scripts/sync-single.js <entity> [<entity> ...] [--full]');
  console.error('');
  console.error('Available entities:');
  console.error('  ' + all.join(', '));
  process.exit(1);
}

runSync(full, args)
  .then((results) => {
    console.log(JSON.stringify(results, null, 2));
    const failed = results.some((r) => r.status === 'error');
    process.exit(failed ? 1 : 0);
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
