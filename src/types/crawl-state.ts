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

export type CrawlLanguage = 'tr' | 'en';
