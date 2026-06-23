#!/usr/bin/env node
'use strict';

require('dotenv').config();
const supabase = require('../src/supabaseClient');
const fs = require('fs');
const path = require('path');

const sqlFile = path.join(__dirname, '../config/schema.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

// Split on statement boundaries and run each
const statements = sql
  .split(/;\s*\n/)
  .map((s) => s.trim())
  .filter(Boolean);

(async () => {
  for (const stmt of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
      if (error) {
        console.warn('Warning:', error.message);
      }
    } catch (err) {
      console.warn('Warning:', err.message || String(err));
    }
  }
  console.log('Schema setup complete. Run via Supabase SQL Editor if exec_sql RPC is not enabled.');
})();
