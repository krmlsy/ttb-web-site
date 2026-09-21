import type { APIRequestContext } from '@playwright/test';
import type { DownloadValidationResult } from '../types/validation-result';

export async function validateDownloads(
  request: APIRequestContext,
  urls: string[],
): Promise<DownloadValidationResult[]> {
  const results: DownloadValidationResult[] = [];

  for (const url of urls) {
    try {
      const response = await request.get(url, {
        failOnStatusCode: false,
        timeout: 30_000,
      });
      const body = await response.body();
      const contentType = response.headers()['content-type'] ?? '';

      if (response.status() !== 200 || body.length === 0) {
        results.push({
          url,
          status: 'INVALID',
          contentType,
          contentLength: body.length,
          message: `HTTP ${response.status()} or empty body`,
        });
        continue;
      }

      results.push({
        url,
        status: 'VALID',
        contentType,
        contentLength: body.length,
        signature: body.subarray(0, 5).toString('ascii'),
      });
    } catch (error) {
      results.push({
        url,
        status: 'CONNECTION_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
