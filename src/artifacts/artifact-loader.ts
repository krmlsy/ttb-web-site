import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env';
import type { CrawlLanguage, CrawlState } from '../types/crawl-state';

const HOSTNAME_TOKEN = '{{hostname}}';
const ARTIFACT_DIR = path.resolve(process.cwd(), 'artifacts');

function replaceHostname(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.split(HOSTNAME_TOKEN).join(env.hostname);
  }

  if (Array.isArray(value)) {
    return value.map(replaceHostname);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, replaceHostname(nested)]),
    );
  }

  return value;
}

export function loadRawArtifact(language: CrawlLanguage): string {
  return fs.readFileSync(
    path.join(ARTIFACT_DIR, `${language}-crawl-state.json`),
    'utf8',
  );
}

export function loadCrawlState(language: CrawlLanguage): CrawlState {
  const raw = loadRawArtifact(language);
  const parsed = JSON.parse(raw) as CrawlState;
  return replaceHostname(parsed) as CrawlState;
}

export function hasUnresolvedHostnameToken(value: unknown): boolean {
  return JSON.stringify(value).includes(HOSTNAME_TOKEN);
}
