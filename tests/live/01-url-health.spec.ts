import { test } from '@playwright/test';
import { env } from '../../src/config/env';
import { loadCrawlState } from '../../src/artifacts/artifact-loader';
import { dedupe } from '../../src/utils/url';
import { validateUrlHealth } from '../../src/validators/url-health-validator';

const trState = loadCrawlState('tr');
const enState = loadCrawlState('en');
const eligibleUrls = dedupe([...trState.discoveredUrls, ...enState.discoveredUrls]);

test.describe('Live internal URL health', () => {
  test.beforeEach(async () => {
    test.skip(!env.runLiveTests, 'RUN_LIVE_TESTS=false; skipping live URL health validation.');
  });

  test('validates internal discovered URLs with APIRequestContext', async ({ request }) => {
    const results = await validateUrlHealth(request, eligibleUrls);
    const failures = results.filter((entry) => entry.status === 'FAIL' || entry.status === 'TIMEOUT' || entry.status === 'CONNECTION_ERROR');
    if (failures.length > 0) {
      throw new Error(`Internal URL validation failed: ${JSON.stringify(failures.slice(0, 5), null, 2)}`);
    }
  });
});
