#!/usr/bin/env node
'use strict';

require('dotenv').config();
const supabase = require('../src/supabaseClient');

(async () => {
  const { data, error } = await supabase
    .from('sync_log')
    .select('*')
    .order('finished_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching logs:', error.message);
    process.exit(1);
  }

  console.table(
    data.map((r) => ({
      entity: r.entity,
      status: r.status,
      records: r.records_synced,
      finished: r.finished_at ? new Date(r.finished_at).toLocaleString() : '-',
      error: r.error || '',
    }))
  );
})();
