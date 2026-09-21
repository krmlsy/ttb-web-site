export type ResourceClassification =
  | 'HTML'
  | 'PDF'
  | 'ZIP'
  | 'DOWNLOAD'
  | 'EXTERNAL'
  | 'MAILTO'
  | 'TEL'
  | 'UNKNOWN';

export function classifyResource(url: string): ResourceClassification {
  const cleaned = (url || '').trim();
  if (!cleaned) return 'UNKNOWN';
  if (/^mailto:/i.test(cleaned)) return 'MAILTO';
  if (/^tel:/i.test(cleaned)) return 'TEL';
  if (/^https?:\/\//i.test(cleaned) === false) {
    return cleaned.includes('://') ? 'EXTERNAL' : 'UNKNOWN';
  }

  const lower = cleaned.toLowerCase();
  if (lower.endsWith('.pdf') || /\/pdf\//i.test(lower) || /pdf\?/i.test(lower)) {
    return 'PDF';
  }
  if (lower.endsWith('.zip') || /\.zip(?:\?|$)/i.test(lower)) {
    return 'ZIP';
  }
  if (
    /(?:\.(doc|docx|xls|xlsx|csv|ppt|pptx|rar|gz|7z|tgz|tar|bz2|exe|apk)|download|\/download\b|\/uploads\b|\/dosya\b)/i.test(lower)
  ) {
    return 'DOWNLOAD';
  }

  return 'HTML';
}
