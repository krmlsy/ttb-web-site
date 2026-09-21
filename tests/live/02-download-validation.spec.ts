import { test } from '@playwright/test';
import { env } from '../../src/config/env';
import { loadCrawlState } from '../../src/artifacts/artifact-loader';
import { validateDownloads } from '../../src/validators/download-validator';

const trState = loadCrawlState('tr');
const enState = loadCrawlState('en');

const pdfUrls = [...new Set([...trState.pdfUrls, ...enState.pdfUrls])];
const downloadUrls = [...new Set([...trState.discoveredUrls, ...enState.discoveredUrls])].filter((url) => /\.(zip|pdf)(?:$|[?#])/i.test(url));

test.describe('Live download validation', () => {
  test.beforeEach(async () => {
    test.skip(!env.runLiveTests, 'RUN_LIVE_TESTS=false; skipping live download validation.');
  });

  test('validates PDFs and downloadable resources without page navigation', async ({ request }) => {
    const results = await validateDownloads(request, [...pdfUrls, ...downloadUrls]);
    const failures = results.filter((entry) => entry.status === 'INVALID' || entry.status === 'TIMEOUT' || entry.status === 'CONNECTION_ERROR');
    if (failures.length > 0) {
      throw new Error(`Download validation failed: ${JSON.stringify(failures.slice(0, 5), null, 2)}`);
    }
  });
});
