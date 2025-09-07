import axios from 'axios';
import { logger } from './logger.js';
import type { Config } from './config.js';

export interface Summary {
  resumen: string;
  bullets: string[];
  comentario: string;
}

export async function summarize(text: string, config: Config): Promise<Summary> {
  const prompt = `Eres analista. Resume el texto en 120-180 palabras. Luego 5 viñetas (máx. 12 palabras c/u). Cierra con 1 comentario crítico (2-3 frases) con impacto para ${config.summarize.topic}. Español neutro, claro. Mantén enlaces si existen. Formato JSON: {"resumen":"...", "bullets":["..."], "comentario":"..."}. Texto:\n\n${text}`;
  try {
    const res = await axios.post(`${process.env.OLLAMA_BASE_URL}/api/generate`, {
      model: process.env.OLLAMA_MODEL,
      prompt,
      stream: false,
    });
    const data = JSON.parse(res.data.response);
    return { resumen: data.resumen, bullets: data.bullets, comentario: data.comentario };
  } catch (err) {
    logger.error({ err }, 'summarize failed');
    return { resumen: '', bullets: [], comentario: '' };
  }
}
