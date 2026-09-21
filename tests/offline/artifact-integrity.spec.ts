import { test, expect } from '@playwright/test';
import { env } from '../support/config';
import { loadCrawlState, loadRawArtifact, hasUnresolvedHostnameToken } from '../support/artifacts';
import { mapLocalizations } from '../support/localization';
import { calculateCoverage } from '../support/reporter';

test.describe('Offline artifact validation', () => {
  test('TR and EN artifacts are complete, valid, and immutable', async () => {
    const trRaw = loadRawArtifact('tr');
    const enRaw = loadRawArtifact('en');

    expect(trRaw).toContain('{{hostname}}');
    expect(enRaw).toContain('{{hostname}}');

    const trState = loadCrawlState('tr');
    const enState = loadCrawlState('en');

    expect(trState.crawlComplete).toBe(true);
    expect(enState.crawlComplete).toBe(true);
    expect(trState.pendingUrls).toEqual([]);
    expect(enState.pendingUrls).toEqual([]);
    expect(trState.discoveredUrls.length).toBeGreaterThan(0);
    expect(enState.discoveredUrls.length).toBeGreaterThan(0);
    expect(hasUnresolvedHostnameToken(trState)).toBe(false);
    expect(hasUnresolvedHostnameToken(enState)).toBe(false);

    const allUrls = [...trState.discoveredUrls, ...enState.discoveredUrls];
    const uniqueUrls = new Set(allUrls);
    expect(uniqueUrls.size).toBe(allUrls.length);
    expect(env.hostname).toBeTruthy();
    expect(env.baseUrl.startsWith('https://')).toBe(true);

    const pairs = mapLocalizations(trState, enState);
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs.some((entry) => entry.classification === 'PAIRED')).toBe(true);

    const coverage = calculateCoverage(allUrls, allUrls, []);
    expect(coverage.complete).toBe(true);
    expect(coverage.unvalidated).toEqual([]);

    expect(JSON.stringify(trState)).not.toContain('{{hostname}}');
    expect(JSON.stringify(enState)).not.toContain('{{hostname}}');
  });
});
