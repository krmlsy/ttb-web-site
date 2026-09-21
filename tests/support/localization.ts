export type LocalizationClassification = 'PAIRED' | 'TR_ONLY' | 'EN_ONLY' | 'UNMAPPED';

export interface LocalizationMapping {
  trUrl: string;
  enUrl?: string;
  classification: LocalizationClassification;
  reason?: string;
}

function normalizeForComparison(value: string): string {
  return value
    .replace(/https?:\/\//gi, '')
    .replace(/\{\{hostname\}\}/gi, '')
    .replace(/\/+/g, '/')
    .replace(/\?.*$/, '')
    .replace(/\/index\.html?$/i, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

export function mapLocalizations(trState: { discoveredUrls: string[] }, enState: { discoveredUrls: string[] }): LocalizationMapping[] {
  const trSet = new Set(trState.discoveredUrls.map(normalizeForComparison));
  const enSet = new Set(enState.discoveredUrls.map(normalizeForComparison));
  const pairs: LocalizationMapping[] = [];

  for (const trUrl of trState.discoveredUrls) {
    const trKey = normalizeForComparison(trUrl);
    const matched = [...enState.discoveredUrls].find((enUrl) => normalizeForComparison(enUrl) === trKey);
    if (matched) {
      pairs.push({ trUrl, enUrl: matched, classification: 'PAIRED', reason: 'Exact URL match after normalization' });
      continue;
    }

    const analogous = [...enState.discoveredUrls].find((enUrl) => {
      const key = normalizeForComparison(enUrl);
      const trLast = trKey.split('/').pop() || '';
      const enLast = key.split('/').pop() || '';
      return trLast && trLast === enLast;
    });

    if (analogous) {
      pairs.push({ trUrl, enUrl: analogous, classification: 'PAIRED', reason: 'Deterministic slug match' });
    } else if (trSet.has(trKey) && !enSet.has(trKey)) {
      pairs.push({ trUrl, classification: 'TR_ONLY', reason: 'No English counterpart found in artifact inventory' });
    }
  }

  for (const enUrl of enState.discoveredUrls) {
    const enKey = normalizeForComparison(enUrl);
    const exists = pairs.some((entry) => entry.enUrl && normalizeForComparison(entry.enUrl) === enKey);
    if (!exists && !trSet.has(enKey)) {
      pairs.push({ trUrl: '', enUrl, classification: 'EN_ONLY', reason: 'No Turkish counterpart found in artifact inventory' });
    }
  }

  return pairs;
}
