import { expect, test } from '@playwright/test';
import { env } from '../../src/config/env';
import { loadCrawlState } from '../../src/utils/artifact-loader';
import { dedupe, displayUrl } from '../../src/utils/url';

for (const language of ['tr', 'en'] as const) {
  const state = loadCrawlState(language);
  const urls = dedupe(state.visitedUrls);

  test.describe(`${language.toUpperCase()} visited URL health`, () => {
    for (const url of urls) {
      test(`GET ${displayUrl(url)}`, async ({ request }) => {
        const response = await request.get(url, {
          failOnStatusCode: false,
          timeout: env.requestTimeoutMs,
        });

        expect(
          response.status(),
          `${url} returned HTTP ${response.status()}`,
        ).toBeLessThan(400);
      });
    }
  });
}
