import express from 'express';
import { publishAndMail, validateWebhook } from './approval.js';
import { loadConfig, Config } from './config.js';
import { updateStatus } from './sheets.js';
import { logger } from './logger.js';

export function startServer(config: Config) {
  const app = express();
  app.get('/healthz', (_req, res) => res.send('ok'));
  app.get('/approve', async (req, res) => {
    const { id, token } = req.query as { id: string; token: string };
    if (!id || !token || !validateWebhook(id, token)) return res.status(401).send('invalid');
    await publishAndMail(id, config);
    await updateStatus(id, 'approved');
    res.send('approved');
  });
  app.get('/reject', async (req, res) => {
    const { id, token } = req.query as { id: string; token: string };
    if (!id || !token || !validateWebhook(id, token)) return res.status(401).send('invalid');
    await updateStatus(id, 'rejected');
    res.send('rejected');
  });
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => logger.info({ port }, 'webhook server listening'));
}

if (import.meta.main) startServer(loadConfig());
