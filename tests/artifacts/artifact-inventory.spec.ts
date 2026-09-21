import { expect, test } from '@playwright/test';
import {
  hasUnresolvedHostnameToken,
  loadCrawlState,
  loadRawArtifact,
} from '../../src/utils/artifact-loader';

for (const language of ['tr', 'en'] as const) {
  test.describe(`${language.toUpperCase()} crawl artifact`, () => {
    test('artifact is valid and crawl is complete', async ({}, testInfo) => {
      const state = loadCrawlState(language);

      expect(state.crawlComplete).toBe(true);
      expect(state.pendingUrls).toHaveLength(0);
      expect(state.visitedUrls.length).toBe(state.totalPagesProcessed);
      expect(state.discoveredUrls.length).toBeGreaterThan(0);
      expect(hasUnresolvedHostnameToken(state)).toBe(false);

      await testInfo.attach(`${language}-crawl-summary.json`, {
        body: JSON.stringify(
          {
            discovered: state.discoveredUrls.length,
            visited: state.visitedUrls.length,
            pending: state.pendingUrls.length,
            pdf: state.pdfUrls.length,
            external: state.externalUrls.length,
            excluded: state.excludedUrls.length,
            errors: state.errors.length,
            crawlComplete: state.crawlComplete,
            totalPagesProcessed: state.totalPagesProcessed,
            lastUpdated: state.lastUpdated,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      });
    });

    test('source artifact keeps {{hostname}} portable', () => {
      const raw = loadRawArtifact(language);
      expect(raw).toContain('{{hostname}}');
    });
  });
}
