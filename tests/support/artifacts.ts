import fs from 'node:fs';
import path from 'node:path';
import { env } from './config';

export type CrawlLanguage = 'tr' | 'en';

export interface CrawlError {
  url: string;
  error: string;
}

export interface ExcludedUrl {
  url: string;
  reason: string;
}

export interface CrawlState {
  discoveredUrls: string[];
  visitedUrls: string[];
  pendingUrls: string[];
  pdfUrls: string[];
  externalUrls: string[];
  excludedUrls: ExcludedUrl[];
  errors: CrawlError[];
  crawlComplete: boolean;
  totalPagesProcessed: number;
  lastUpdated: string;
}

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
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, replaceHostname(nested)]));
  }

  return value;
}

export function loadRawArtifact(language: CrawlLanguage): string {
  return fs.readFileSync(path.join(ARTIFACT_DIR, `${language}-crawl-state.json`), 'utf8');
}

export function loadCrawlState(language: CrawlLanguage): CrawlState {
  const parsed = JSON.parse(loadRawArtifact(language)) as CrawlState;
  return replaceHostname(parsed) as CrawlState;
}

export function hasUnresolvedHostnameToken(value: unknown): boolean {
  return JSON.stringify(value).includes(HOSTNAME_TOKEN);
}

export function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function displayUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return `${url.pathname}${url.search}` || '/';
  } catch {
    return rawUrl;
  }
}
