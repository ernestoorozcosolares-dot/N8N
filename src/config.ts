import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import YAML from 'yaml';

export interface FeedConfig {
  name: string;
  mode: 'auto' | 'rss' | 'html';
  pageUrl: string;
  forceRssUrl?: string;
  list?: { selector: string; attr: string };
  article?: { selector: string };
}

export interface Config {
  feeds: FeedConfig[];
  translate: { enabled: boolean; targetLang: string };
  summarize: { topic: string; style: string };
  approval: {
    method: 'gmail' | 'webhook';
    email_subject_prefix: string;
    webhook: { approve_url: string; reject_url: string };
  };
  destinations: {
    blogger: { enabled: boolean; draft: boolean; labels: string[] };
    email_list: { enabled: boolean; subjectPrefix: string; useBrevoListId: boolean };
  };
}

export function loadConfig(configPath = 'config.yaml'): Config {
  dotenv.config();
  const yamlPath = path.resolve(configPath);
  const file = fs.readFileSync(yamlPath, 'utf8');
  const cfg = YAML.parse(file) as Config;
  return cfg;
}
