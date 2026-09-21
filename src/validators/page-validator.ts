import type { BrowserContext, Page } from '@playwright/test';
import type { PageValidationResult } from '../types/validation-result';

export async function validatePageRuntime(
  page: Page,
  _context: BrowserContext,
  url: string,
): Promise<PageValidationResult> {
  const response = await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  const finalUrl = page.url();
  const htmlLang = await page.locator('html').getAttribute('lang');
  const title = await page.title();
  const bodyText = (await page.locator('body').innerText()).trim();
  const hasVisibleContent = bodyText.length > 0;
  const hasHeader = (await page.locator('header').count()) > 0;
  const hasFooter = (await page.locator('footer').count()) > 0;

  const brokenImages = await page.locator('img').evaluateAll((nodes) =>
    Array.from(nodes)
      .filter((img): img is HTMLImageElement => img instanceof HTMLImageElement)
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.src),
  );

  const result: PageValidationResult = {
    url,
    originalUrl: url,
    finalUrl,
    status: response && response.status() < 400 ? 'PASS' : 'FAIL',
    title,
    htmlLang,
    hasVisibleContent,
    hasHeader,
    hasFooter,
    brokenImages,
    redirects: [],
    consoleErrors: [],
    pageErrors: [],
    networkErrors: [],
    localizationWarnings: [],
    message: response ? undefined : 'No response received',
  };

  return result;
}
