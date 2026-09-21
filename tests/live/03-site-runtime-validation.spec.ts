import { test } from '@playwright/test';
import { env } from '../../src/config/env';
import { loadCrawlState } from '../../src/artifacts/artifact-loader';
import { classifyResource } from '../../src/utils/resource-classifier';
import { validatePageRuntime } from '../../src/validators/page-validator';

const trState = loadCrawlState('tr');
const enState = loadCrawlState('en');
const pages = [...new Set([...trState.discoveredUrls, ...enState.discoveredUrls])].filter((url) => classifyResource(url) === 'HTML');

test.describe('Runtime page validation', () => {
  test.beforeEach(async () => {
    test.skip(!env.runLiveTests, 'RUN_LIVE_TESTS=false; skipping live runtime validation.');
  });

  test('validates each HTML page in one navigation with content, localization, network, console, redirects, and image checks', async ({ page, context }) => {
    for (const url of pages) {
      const result = await validatePageRuntime(page, context, url);
      if (result.status === 'FAIL' || result.status === 'REDIRECT' || result.status === 'TIMEOUT' || result.status === 'CONNECTION_ERROR') {
        throw new Error(`Runtime validation failed for ${url}: ${JSON.stringify(result, null, 2)}`);
      }
    }
  });
});
