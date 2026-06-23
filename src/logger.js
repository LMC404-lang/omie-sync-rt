const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const config = require('./config');
const fs = require('fs');

if (!fs.existsSync(config.log.dir)) fs.mkdirSync(config.log.dir, { recursive: true });

const logger = createLogger({
  level: config.log.level,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, ...meta }) => {
      const extras = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
      return `[${timestamp}] ${level.toUpperCase().padEnd(5)} ${message}${extras}`;
    })
  ),
  transports: [
    new transports.Console(),
    new transports.DailyRotateFile({
      dirname: config.log.dir,
      filename: 'sync-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    }),
  ],
});

module.exports = logger;
