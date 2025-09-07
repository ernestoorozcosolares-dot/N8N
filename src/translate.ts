import axios from 'axios';
import { logger } from './logger.js';
import type { Config } from './config.js';

export async function maybeTranslate(text: string, config: Config): Promise<string> {
  if (!config.translate.enabled) return text;
  try {
    const res = await axios.post(`${process.env.LIBRETRANSLATE_URL}/translate`, {
      q: text,
      source: 'auto',
      target: config.translate.targetLang,
      format: 'text',
    });
    return res.data.translatedText || text;
  } catch (err) {
    logger.error({ err }, 'translate failed');
    return text;
  }
}
