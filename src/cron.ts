import cron from 'node-cron';
import { loadConfig } from './config.js';
import { scanFeeds } from './pipeline.js';
import { pollGmailReplies } from './approval.js';
import { logger } from './logger.js';
import { startServer } from './server.js';

export function start() {
  const config = loadConfig();
  cron.schedule('0 */6 * * *', () => scanFeeds(config));
  cron.schedule('*/5 * * * *', () => pollGmailReplies(config));
  if (config.approval.method === 'webhook') {
    startServer(config);
  }
  logger.info('cron started');
}

if (import.meta.main) start();
