import { loadConfig, Config } from './config.js';
import { fetchFeed } from './feeds.js';
import { normalize } from './normalize.js';
import { maybeTranslate } from './translate.js';
import { summarize } from './summarize.js';
import { lookupByUrl, appendRow } from './sheets.js';
import { sendApprovalEmail } from './email.js';
import { slugify } from './utils.js';
import pLimit from 'p-limit';
import { logger } from './logger.js';

export async function scanFeeds(config?: Config) {
  const cfg = config || loadConfig();
  const limit = pLimit(3);
  for (const feed of cfg.feeds) {
    logger.info({ feed: feed.name }, 'processing feed');
    const articles = await fetchFeed(feed);
    const tasks = articles.map((art) =>
      limit(async () => {
        if (!art.url) return;
        const exists = await lookupByUrl(art.url);
        if (exists) return;
        const norm = normalize(art.html || art.text);
        const translated = await maybeTranslate(norm.markdown, cfg);
        const summary = await summarize(translated, cfg);
        const id = slugify(art.title) + '-' + Date.now();
        const resumen_md = `${summary.resumen}\n\n${summary.bullets.map((b) => `- ${b}`).join('\n')}`;
        await appendRow({
          id,
          fecha_iso: new Date().toISOString(),
          fuente: feed.name,
          titulo: art.title,
          url_fuente: art.url,
          resumen_md,
          comentario: summary.comentario,
          status: 'pending',
        });
        await sendApprovalEmail(id, art.title, summary.resumen, summary.bullets, summary.comentario, art.url, cfg);
      })
    );
    await Promise.all(tasks);
  }
}

if (import.meta.main) {
  scanFeeds().catch((err) => {
    logger.error({ err }, 'scanFeeds failed');
    process.exit(1);
  });
}
