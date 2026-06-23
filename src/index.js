'use strict';

require('dotenv').config();
const cron = require('node-cron');
const config = require('./config');
const { runSync } = require('./sync');
const logger = require('./logger');

// Validate required env vars
const required = ['OMIE_APP_KEY', 'OMIE_APP_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  logger.error('Missing required environment variables', { missing });
  process.exit(1);
}

logger.info('Omie → Supabase sync service started', {
  incrementalEveryHours: config.sync.intervalHours,
  fullSyncCron: config.sync.fullSyncCron,
});

// Incremental sync every N hours
const incrementalCron = `0 */${config.sync.intervalHours} * * *`;
cron.schedule(incrementalCron, () => {
  logger.info('Running scheduled incremental sync...');
  runSync(false);
});

// Full sync once per day (default 2am)
cron.schedule(config.sync.fullSyncCron, () => {
  logger.info('Running scheduled FULL sync...');
  runSync(true);
});

// Run incremental sync immediately on startup
logger.info('Running initial sync on startup...');
runSync(false);
