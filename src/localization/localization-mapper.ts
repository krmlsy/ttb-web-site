import type { CrawlState } from '../types/crawl-state';
import type { LocalizationMapping } from '../types/validation-result';

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

export function mapLocalizations(
  trState: Pick<CrawlState, 'discoveredUrls'>,
  enState: Pick<CrawlState, 'discoveredUrls'>,
): LocalizationMapping[] {
  const trSet = new Set(trState.discoveredUrls.map(normalizeForComparison));
  const enSet = new Set(enState.discoveredUrls.map(normalizeForComparison));
  const pairs: LocalizationMapping[] = [];

  for (const trUrl of trState.discoveredUrls) {
    const trKey = normalizeForComparison(trUrl);
    const exactMatch = [...enState.discoveredUrls].find(
      (enUrl) => normalizeForComparison(enUrl) === trKey,
    );

    if (exactMatch) {
      pairs.push({
        trUrl,
        enUrl: exactMatch,
        classification: 'PAIRED',
        reason: 'Exact URL match after normalization',
      });
      continue;
    }

    const slugMatch = [...enState.discoveredUrls].find((enUrl) => {
      const key = normalizeForComparison(enUrl);
      const trLast = trKey.split('/').pop() || '';
      const enLast = key.split('/').pop() || '';
      return Boolean(trLast) && trLast === enLast;
    });

    if (slugMatch) {
      pairs.push({
        trUrl,
        enUrl: slugMatch,
        classification: 'PAIRED',
        reason: 'Deterministic slug match',
      });
      continue;
    }

    if (trSet.has(trKey) && !enSet.has(trKey)) {
      pairs.push({
        trUrl,
        classification: 'TR_ONLY',
        reason: 'No matching English artifact URL found',
      });
    }
  }

  for (const enUrl of enState.discoveredUrls) {
    const enKey = normalizeForComparison(enUrl);
    const alreadyMapped = pairs.some(
      (entry) => entry.enUrl && normalizeForComparison(entry.enUrl) === enKey,
    );

    if (!alreadyMapped && !trSet.has(enKey)) {
      pairs.push({
        trUrl: '',
        enUrl,
        classification: 'EN_ONLY',
        reason: 'No matching Turkish artifact URL found',
      });
    }
  }

  return pairs;
}
