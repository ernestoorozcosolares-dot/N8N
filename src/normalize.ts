import cheerio from 'cheerio';
import Turndown from 'turndown';

const turndown = new Turndown();

export function normalize(html: string): { html: string; markdown: string } {
  const $ = cheerio.load(html);
  $('script, iframe').remove();
  const cleanHtml = $.html();
  let markdown = turndown.turndown(cleanHtml);
  if (markdown.length > 5000) markdown = markdown.slice(0, 5000) + '...';
  return { html: cleanHtml, markdown };
}
