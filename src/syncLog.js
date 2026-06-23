'use strict';

const supabase = require('./supabaseClient');
const logger = require('./logger');

async function writeLog({ entity, recordsSynced, startedAt, status, error = null }) {
  const { error: dbErr } = await supabase.from('sync_log').insert({
    entity,
    records_synced: recordsSynced,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status,
    error,
  });

  if (dbErr) logger.warn('Could not write sync_log', { error: dbErr.message });
}

async function getLastSync(entity) {
  const { data, error } = await supabase
    .from('sync_log')
    .select('finished_at')
    .eq('entity', entity)
    .eq('status', 'success')
    .order('finished_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return new Date(data.finished_at);
}

module.exports = { writeLog, getLastSync };
