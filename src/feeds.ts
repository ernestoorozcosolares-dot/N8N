import axios from 'axios';
import cheerio from 'cheerio';
import Parser from 'rss-parser';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { retry, absoluteUrl } from './utils.js';
import type { FeedConfig } from './config.js';
import { logger } from './logger.js';

const parser = new Parser();

export async function discoverRss(pageUrl: string): Promise<string | null> {
  try {
    const res = await retry(() => axios.get(pageUrl));
    const $ = cheerio.load(res.data);
    const link = $('link[rel="alternate"][type="application/rss+xml"]').attr('href');
    if (link) return absoluteUrl(pageUrl, link);
    // heuristic
    if (res.request?.res?.responseUrl?.endsWith('/feed')) return res.request.res.responseUrl;
    const feedLink = $('a[href*="/feed"]').attr('href');
    return feedLink ? absoluteUrl(pageUrl, feedLink) : null;
  } catch (err) {
    logger.error({ err, pageUrl }, 'discoverRss failed');
    return null;
  }
}

export async function readRss(url: string) {
  return parser.parseURL(url);
}

export async function scrapeList(pageUrl: string, selector: string, attr: string) {
  const res = await retry(() => axios.get(pageUrl));
  const $ = cheerio.load(res.data);
  const links = new Set<string>();
  $(selector).each((_, el) => {
    const href = $(el).attr(attr);
    if (href) links.add(absoluteUrl(pageUrl, href));
  });
  return Array.from(links);
}

export interface Article {
  title: string;
  url: string;
  isoDate?: string;
  html: string;
  text: string;
}

export async function scrapeArticle(url: string, selector?: string): Promise<Article | null> {
  try {
    const res = await retry(() => axios.get(url));
    const dom = new JSDOM(res.data, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    let content = article?.content;
    let title = article?.title || dom.window.document.title;
    if (!content && selector) {
      const $ = cheerio.load(res.data);
      content = $(selector).html() || '';
    }
    const text = dom.window.document.body.textContent || '';
    return { title, url, isoDate: new Date().toISOString(), html: content || '', text };
  } catch (err) {
    logger.error({ err, url }, 'scrapeArticle failed');
    return null;
  }
}

export async function fetchFeed(feed: FeedConfig): Promise<Article[]> {
  const rssUrl = feed.forceRssUrl || (await discoverRss(feed.pageUrl));
  if (rssUrl) {
    const feedData = await readRss(rssUrl);
    return feedData.items.map((i) => ({
      title: i.title || '',
      url: i.link || '',
      isoDate: i.isoDate,
      html: i['content:encoded'] || i.content || '',
      text: i.contentSnippet || '',
    }));
  }
  // fallback to scraping list
  if (!feed.list) return [];
  const links = await scrapeList(feed.pageUrl, feed.list.selector, feed.list.attr);
  const articles: Article[] = [];
  for (const link of links) {
    const art = await scrapeArticle(link, feed.article?.selector);
    if (art) articles.push(art);
  }
  return articles;
}
