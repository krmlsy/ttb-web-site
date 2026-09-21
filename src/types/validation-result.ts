export type ValidationStatus =
  | 'PASS'
  | 'FAIL'
  | 'REDIRECT'
  | 'TIMEOUT'
  | 'CONNECTION_ERROR'
  | 'VALID'
  | 'INVALID'
  | 'WARNING';

export type ResourceClassification =
  | 'HTML'
  | 'PDF'
  | 'ZIP'
  | 'DOWNLOAD'
  | 'EXTERNAL'
  | 'MAILTO'
  | 'TEL'
  | 'UNKNOWN';

export type LocalizationClassification = 'PAIRED' | 'TR_ONLY' | 'EN_ONLY' | 'UNMAPPED';

export interface UrlHealthResult {
  originalUrl: string;
  finalUrl?: string;
  status: ValidationStatus;
  httpStatus?: number;
  redirectCount: number;
  message?: string;
}

export interface DownloadValidationResult {
  url: string;
  status: 'VALID' | 'INVALID' | 'TIMEOUT' | 'CONNECTION_ERROR';
  contentType?: string;
  contentLength?: number;
  signature?: string;
  sourcePages?: string[];
  message?: string;
}

export interface PageValidationResult {
  url: string;
  originalUrl: string;
  finalUrl: string;
  status: 'PASS' | 'FAIL' | 'REDIRECT' | 'TIMEOUT' | 'CONNECTION_ERROR';
  title?: string;
  htmlLang?: string | null;
  hasVisibleContent: boolean;
  hasHeader: boolean;
  hasFooter: boolean;
  brokenImages: string[];
  redirects: string[];
  consoleErrors: string[];
  pageErrors: string[];
  networkErrors: string[];
  localizationWarnings: string[];
  message?: string;
}

export interface LocalizationMapping {
  trUrl: string;
  enUrl?: string;
  classification: LocalizationClassification;
  reason?: string;
}

export interface CoverageSummary {
  eligibleDiscoveredUrls: string[];
  validatedUrls: string[];
  explicitlyExcludedUrls: string[];
  unvalidated: string[];
  complete: boolean;
}
