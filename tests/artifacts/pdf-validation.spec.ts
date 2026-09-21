import { expect, test } from '@playwright/test';
import { env } from '../../src/config/env';
import { loadCrawlState } from '../../src/utils/artifact-loader';
import { dedupe, displayUrl } from '../../src/utils/url';

const tr = loadCrawlState('tr');
const en = loadCrawlState('en');
const pdfUrls = dedupe([...tr.pdfUrls, ...en.pdfUrls]);

test.describe('PDF validation from crawl artifacts', () => {
  pdfUrls.forEach((url, index) => {
    test(`PDF ${displayUrl(url)} [${index + 1}]`, async ({ request }) => {
      const response = await request.get(url, {
        failOnStatusCode: false,
        timeout: env.requestTimeoutMs,
      });

      expect(response.status(), `${url} must return HTTP 200`).toBe(200);

      const contentType = response.headers()['content-type'] ?? '';
      expect(
        contentType.toLowerCase(),
        `${url} returned Content-Type: ${contentType || '<empty>'}`,
      ).toContain('application/pdf');

      const body = await response.body();
      expect(body.length, `${url} returned an empty body`).toBeGreaterThan(0);

      const signature = body.subarray(0, 5).toString('ascii');
      expect(signature, `${url} is not a valid PDF payload`).toBe('%PDF-');
    });
  });
});
