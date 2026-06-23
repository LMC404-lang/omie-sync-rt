'use strict';

const supabase = require('./supabaseClient');
const config = require('./config');
const logger = require('./logger');

const TRANSIENT_ERROR_PATTERNS = [
  'fetch failed',
  'getaddrinfo',
  'ENOTFOUND',
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'socket hang up',
  'network',
  'timeout',
  'TLS',
  '503',
  '504',
];

function isTransient(err) {
  const msg = (err && (err.message || String(err))) || '';
  return TRANSIENT_ERROR_PATTERNS.some((p) => msg.toLowerCase().includes(p.toLowerCase()));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Upsert records into a Supabase table in batches.
 *
 * Transient network failures (DNS, timeouts, socket resets) are retried
 * up to MAX_RETRIES times with exponential backoff so a flaky internet
 * connection during a long sync doesn't blow away the whole entity.
 *
 * @param {string} table
 * @param {Array}  records
 * @param {string} conflictColumn - column used for ON CONFLICT
 *                                  (comma-separated for composite keys)
 */
async function upsert(table, records, conflictColumn = 'omie_id') {
  if (!records.length) return;

  const { batchSize } = config.sync;
  const MAX_RETRIES = 4;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    let attempt = 0;
    while (true) {
      attempt++;
      let error;
      try {
        const result = await supabase
          .from(table)
          .upsert(batch, { onConflict: conflictColumn });
        error = result.error;
      } catch (thrown) {
        error = thrown;
      }

      if (!error) break;

      const transient = isTransient(error);
      if (transient && attempt <= MAX_RETRIES) {
        const backoff = Math.min(30_000, 1000 * 2 ** (attempt - 1));
        logger.warn(`Upsert transient error on ${table}, retrying`, {
          attempt,
          batch_start: i,
          backoff_ms: backoff,
          error: error.message || String(error),
        });
        await sleep(backoff);
        continue;
      }

      logger.error(`Upsert failed on ${table}`, {
        error: error.message || String(error),
        batch_start: i,
        attempts: attempt,
      });
      throw new Error(`Supabase upsert error [${table}]: ${error.message || error}`);
    }

    logger.debug(`Upserted batch to ${table}`, {
      start: i,
      count: batch.length,
    });
  }
}

module.exports = { upsert };
