import fs from 'node:fs';
import path from 'node:path';

type ResourceClassification = 'HTML' | 'PDF' | 'ZIP' | 'DOWNLOAD' | 'EXTERNAL' | 'MAILTO' | 'TEL' | 'UNKNOWN';

function classifyResource(url: string): ResourceClassification {
  const value = url.trim().toLowerCase();
  if (!value) return 'UNKNOWN';
  if (value.startsWith('mailto:')) return 'MAILTO';
  if (value.startsWith('tel:')) return 'TEL';
  if (!value.startsWith('http://') && !value.startsWith('https://')) return value.includes('://') ? 'EXTERNAL' : 'UNKNOWN';
  if (value.endsWith('.pdf') || value.includes('/pdf/') || value.includes('pdf?')) return 'PDF';
  if (value.endsWith('.zip') || /\.zip(?:\?|$)/.test(value)) return 'ZIP';
  if (/\.(doc|docx|xls|xlsx|csv|ppt|pptx|rar|gz|7z|tgz|tar|bz2|exe|apk)(?:\?|$)|download|\/uploads\b|\/dosya\b/.test(value)) return 'DOWNLOAD';
  return 'HTML';
}

type CrawlState = {
  discoveredUrls?: string[];
  pdfUrls?: string[];
  errors?: Array<{ url: string; error: string }>;
};

type TestRecord = {
  title?: string;
  ok?: boolean;
  file?: string;
  tests?: Array<{
    status?: string;
    results?: Array<{ status?: string; errors?: Array<{ message?: string }> }>;
  }>;
  specs?: TestRecord[];
  suites?: TestRecord[];
};

const root = process.cwd();
const artifactDir = path.join(root, 'artifacts');
const resultCandidates = [
  path.join(root, 'test-results', 'results.jsonl'),
  path.join(root, 'test-results', 'results.json'),
];
const outputPath = path.join(root, 'reports', 'playwright-summary.html');

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function readResults(): { source: string; report: TestRecord } {
  const resultPath = resultCandidates.find((candidate) => fs.existsSync(candidate));
  if (!resultPath) {
    throw new Error('Playwright sonucu bulunamadı: test-results/results.jsonl veya test-results/results.json');
  }

  const raw = fs.readFileSync(resultPath, 'utf8').trim();
  if (resultPath.endsWith('.jsonl')) {
    const records = raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as TestRecord);
    return { source: path.relative(root, resultPath), report: { suites: records } };
  }
  return { source: path.relative(root, resultPath), report: readJson<TestRecord>(resultPath) };
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('tr-TR').format(value);
}

function countResources(urls: string[]): Record<ResourceClassification, number> {
  const counts: Record<ResourceClassification, number> = {
    HTML: 0, PDF: 0, ZIP: 0, DOWNLOAD: 0, EXTERNAL: 0, MAILTO: 0, TEL: 0, UNKNOWN: 0,
  };
  for (const url of urls) counts[classifyResource(url)] += 1;
  return counts;
}

function flattenTests(record: TestRecord): TestRecord[] {
  const current = record.title && (record.tests || record.ok !== undefined) ? [record] : [];
  return [...current, ...(record.suites ?? []).flatMap(flattenTests), ...(record.specs ?? []).flatMap(flattenTests)];
}

function summarizeTests(report: TestRecord) {
  const checks = flattenTests(report).map((entry) => {
    const attempt = entry.tests?.[0];
    const failed = entry.ok === false || attempt?.status === 'failed' || attempt?.results?.some((result) => result.status === 'failed');
    const message = attempt?.results?.flatMap((result) => result.errors ?? []).find((error) => error.message)?.message;
    return { title: entry.title ?? 'Adsız kontrol', file: entry.file ?? '', status: failed ? 'başarısız' : 'başarılı', message };
  });
  const passed = checks.filter((check) => check.status === 'başarılı').length;
  return { checks, passed, failed: checks.length - passed, total: checks.length, rate: checks.length ? passed / checks.length * 100 : 0 };
}

function metric(label: string, value: string | number): string {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function list(items: string[], emptyText: string): string {
  return items.length ? `<ul>${items.map((item) => `<li><code>${escapeHtml(item)}</code></li>`).join('')}</ul>` : `<p class="empty">${emptyText}</p>`;
}

function resourceRows(language: string, counts: Record<ResourceClassification, number>): string {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => `<tr><td>${language}</td><td>${kind}</td><td>${formatNumber(count)}</td></tr>`)
    .join('');
}

const tr = readJson<CrawlState>(path.join(artifactDir, 'tr-crawl-state.json'));
const en = readJson<CrawlState>(path.join(artifactDir, 'en-crawl-state.json'));
const results = readResults();
const trUrls = tr.discoveredUrls ?? [];
const enUrls = en.discoveredUrls ?? [];
const checks = summarizeTests(results.report);
const allDiscoveredUrls = [...new Set([...trUrls, ...enUrls])];
const pdfUrls = [...new Set([...(tr.pdfUrls ?? []), ...(en.pdfUrls ?? [])])];
const zipUrls = allDiscoveredUrls.filter((url) => /\.zip(?:$|[?#])/i.test(url));
const trPageUrls = [...new Set(trUrls)].filter((url) => classifyResource(url) === 'HTML');
const enPageUrls = [...new Set(enUrls)].filter((url) => classifyResource(url) === 'HTML');
const controlCounts = {
  pdf: pdfUrls.length,
  urlHealth: allDiscoveredUrls.length,
  zip: zipUrls.length,
  pageTr: trPageUrls.length,
  pageEn: enPageUrls.length,
};
const scenarioTotal = Object.values(controlCounts).reduce((total, count) => total + count, 0);
const crawlErrors = [
  ...(tr.errors ?? []).map((error) => `TR: ${error.url} - ${error.error}`),
  ...(en.errors ?? []).map((error) => `EN: ${error.url} - ${error.error}`),
];
const failedChecks = checks.checks
  .filter((check) => check.status === 'başarısız')
  .map((check) => `${check.title}${check.message ? ` - ${check.message}` : ''}`);
const failedCount = failedChecks.length + crawlErrors.length;
const overallStatus = failedCount === 0 ? 'Başarılı' : 'Aksiyon gerekli';
const overallStatusClass = failedCount === 0 ? 'status-ok' : 'status-risk';
const checkRows = checks.checks.length
  ? checks.checks.map((check) => `<tr><td>${escapeHtml(check.title)}</td><td>${escapeHtml(check.file || '-')}</td><td><span class="badge ${check.status === 'başarılı' ? 'status-ok' : 'status-fail'}">${escapeHtml(check.status)}</span></td><td>${escapeHtml(check.message || '-')}</td></tr>`).join('')
  : '<tr><td colspan="4">Playwright kontrol sonucu bulunamadı.</td></tr>';
const errorRows = [
  ...failedChecks.map((error) => `<tr><td>Playwright</td><td>${escapeHtml(error)}</td></tr>`),
  ...crawlErrors.map((error) => `<tr><td>Crawl</td><td>${escapeHtml(error)}</td></tr>`),
].join('');
const failureTable = errorRows
  ? `<table><thead><tr><th>Kaynak</th><th>Hata / bulgu</th></tr></thead><tbody>${errorRows}</tbody></table>`
  : '<p class="empty">Başarısız kontrol veya crawl hatası bulunamadı.</p>';

const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Playwright ve Crawl Özeti</title>
<style>
:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#e8edf2;background:#0b1117}body{margin:0;line-height:1.5}main{max-width:1220px;margin:0 auto;padding:28px 20px 64px}header{background:#151f2b;color:#fff;padding:30px;border:1px solid #2d3c4d;border-radius:10px;display:flex;justify-content:space-between;gap:24px;align-items:flex-start}h1{margin:0 0 6px;font-size:30px}h2{margin:34px 0 12px;color:#a9d6e5}h3{margin-top:0}.muted,.empty{color:#9aaaba}.summary{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.badge{display:inline-block;border-radius:999px;padding:3px 9px;font-size:12px;font-weight:700}.status-ok{color:#9af0c4;background:#153b2e}.status-risk{color:#ffb4ab;background:#51211e}.status-fail{color:#ffb4ab;background:#51211e}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-top:18px}.metric{background:#151f2b;border:1px solid #2d3c4d;border-radius:8px;padding:16px}.metric span{display:block;color:#9aaaba;font-size:13px}.metric strong{display:block;margin-top:4px;font-size:25px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:16px}section,details{background:#111a24;border:1px solid #2d3c4d;border-radius:8px;padding:20px;margin-top:16px;overflow:auto}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #2d3c4d;padding:10px;text-align:left;vertical-align:top}th{background:#1b2937;font-size:13px}code{overflow-wrap:anywhere;color:#c6e6ef}summary{cursor:pointer;font-weight:700;color:#a9d6e5}ul{padding-left:22px}
</style></head><body><main>
<header><div><h1>Playwright ve Crawl Doğrulama Özeti</h1><div>İş birimi ve geliştirme ekipleri için durum raporu</div></div><div class="summary"><span class="badge ${overallStatusClass}">${overallStatus}</span><span>Üretim: ${escapeHtml(new Date().toLocaleString('tr-TR'))}</span></div></header>
<section><h2>Playwright test sonuçları</h2><p>${failedCount === 0 ? 'Tüm kontroller başarıyla tamamlandı.' : `<strong>${formatNumber(failedCount)} bulgu</strong> aksiyon gerektiriyor. Detaylar aşağıdaki teknik inceleme bölümünde listelenmiştir.`}</p><div class="metrics">${metric('Toplam senaryo', checks.total)}${metric('Başarılı senaryo', checks.passed)}${metric('Başarısız senaryo', checks.failed)}${metric('Başarı oranı', `%${checks.rate.toFixed(1)}`)}${metric('Sonuç kaynağı', results.source)}</div></section>
<h2>Kontrol senaryoları</h2><section><p class="muted">Toplam senaryo sayısı aşağıdaki kontrol gruplarının gerçek hedef adetlerinin toplamıdır.</p><div class="metrics">${metric('PDF download', controlCounts.pdf)}${metric('URL health', controlCounts.urlHealth)}${metric('ZIP download', controlCounts.zip)}${metric('Page validate TR', controlCounts.pageTr)}${metric('Page validate EN', controlCounts.pageEn)}${metric('Toplam kontrol', scenarioTotal)}</div></section>
<h2>Kontrol türleri ve URL adetleri</h2><section><table><thead><tr><th>Dil</th><th>Kaynak türü</th><th>URL adedi</th></tr></thead><tbody>${resourceRows('TR', countResources(trUrls))}${resourceRows('EN', countResources(enUrls))}</tbody></table></section>
<h2>Geliştirici görünümü</h2><details open><summary>Playwright kontrol sonuçları</summary><table><thead><tr><th>Kontrol</th><th>Dosya</th><th>Durum</th><th>Mesaj</th></tr></thead><tbody>${checkRows}</tbody></table></details>
<details open><summary>Başarısız kontroller ve crawl hataları (${failedCount})</summary>${failureTable}</details>
<p class="muted">Rapor, artifact JSON dosyalarını değiştirmeden mevcut Playwright sonucundan üretildi. Sonuç kaynağı: ${escapeHtml(results.source)}</p></main></body></html>`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html, 'utf8');
console.log(`Rapor üretildi: ${path.relative(root, outputPath)}`);