#!/usr/bin/env node
'use strict';

/**
 * CLI helper to inspect or run the registry-driven Omie tables.
 *
 *   node scripts/sync-tables.js list                        # list every table the registry knows about
 *   node scripts/sync-tables.js list --tier critical
 *   node scripts/sync-tables.js list --phase 1
 *   node scripts/sync-tables.js sync                        # sync every active table
 *   node scripts/sync-tables.js sync --tier critical
 *   node scripts/sync-tables.js sync --phase 1,2
 *   node scripts/sync-tables.js sync --name omie_categories,omie_units
 *   node scripts/sync-tables.js sync --full                 # ignore last-sync timestamp
 *
 * Tier filter has the same vocabulary as OMIE_SYNC_TIERS in .env.
 */

require('dotenv').config();
const { TABLES, activeTables } = require('../config/omie-tables');
const { runSync } = require('../src/sync');

function parseFlag(name) {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

function multi(value) {
  if (!value) return null;
  return value
    .toLowerCase()
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const subcommand = process.argv[2];
const tierFilter = multi(parseFlag('tier'));
const phaseFilter = multi(parseFlag('phase'));
const nameFilter = multi(parseFlag('name'));
const tableFilter = multi(parseFlag('table'));
const full = process.argv.includes('--full');

function applyFilters(list) {
  return list.filter((t) => {
    if (tierFilter && !tierFilter.includes(t.tier)) return false;
    if (phaseFilter && !phaseFilter.includes(String(t.phase))) return false;
    if (nameFilter && !nameFilter.includes(t.name)) return false;
    if (tableFilter && !tableFilter.includes(t.table)) return false;
    return true;
  });
}

if (subcommand === 'list') {
  const source = tierFilter || phaseFilter || nameFilter || tableFilter
    ? applyFilters(TABLES)
    : TABLES;

  const tierIcon = {
    critical: 'CRIT',
    important: 'IMPT',
    optional: 'OPTL',
    industry: 'INDS',
  };
  console.log('Phase  Tier  Table                                       Endpoint                                    Action');
  console.log('-----  ----  ------------------------------------------  ------------------------------------------  --------------------');
  for (const t of source) {
    console.log(
      `  ${String(t.phase).padEnd(4)}` +
        ` ${tierIcon[t.tier].padEnd(5)}` +
        ` ${t.table.padEnd(43)}` +
        ` ${t.endpoint.padEnd(43)}` +
        ` ${t.action}`
    );
  }
  console.log(`\nTotal: ${source.length} table(s).`);
  process.exit(0);
}

if (subcommand === 'sync') {
  // Build the target list.  When no filter flag is set, fall back to the
  // tier-filtered active set (env-driven), keeping behaviour consistent
  // with the scheduled run.
  const filtered = tierFilter || phaseFilter || nameFilter || tableFilter
    ? applyFilters(TABLES)
    : activeTables();

  if (!filtered.length) {
    console.error('No tables matched the given filters.');
    process.exit(1);
  }

  const names = filtered.map((t) => t.name);
  console.log(`Syncing ${names.length} table(s) (${full ? 'FULL' : 'incremental'}):`);
  console.log('  ' + names.join(', '));

  runSync(full, names)
    .then((results) => {
      const ok = results.filter((r) => r.status === 'success').length;
      const fail = results.filter((r) => r.status === 'error').length;
      console.log(`\nDone: ${ok} ok, ${fail} failed.`);
      process.exit(fail ? 1 : 0);
    })
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
} else {
  console.error('Usage:');
  console.error('  node scripts/sync-tables.js list  [--tier <t>] [--phase <p>] [--name <n>]');
  console.error('  node scripts/sync-tables.js sync  [--tier <t>] [--phase <p>] [--name <n>] [--full]');
  process.exit(1);
}
