import type { APIRequestContext } from '@playwright/test';
import type { UrlHealthResult } from '../types/validation-result';

export async function validateUrlHealth(
  request: APIRequestContext,
  urls: string[],
): Promise<UrlHealthResult[]> {
  const results: UrlHealthResult[] = [];

  for (const url of urls) {
    try {
      const response = await request.get(url, {
        failOnStatusCode: false,
        timeout: 30_000,
      });
      const status = response.status();
      const finalUrl = response.url();

      results.push({
        originalUrl: url,
        finalUrl,
        status: status >= 400 ? 'FAIL' : 'PASS',
        httpStatus: status,
        redirectCount: 0,
        message: status >= 400 ? `HTTP ${status}` : undefined,
      });
    } catch (error) {
      results.push({
        originalUrl: url,
        status: 'CONNECTION_ERROR',
        redirectCount: 0,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
