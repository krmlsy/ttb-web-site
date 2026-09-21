# TTB Final Automation Test Strategy

## 1. Purpose

This document defines the final Playwright + TypeScript automation strategy for validating the TTB website using the completed Turkish and English crawl artifacts as the source of truth.

The website discovery/crawl phase is already complete.

The current development machine does **not** need access to the target UAT website. The implementation can be generated and compiled offline, then pushed to GitHub and executed later on a corporate machine that has access to the UAT environment.

---

## 2. Source of Truth

The following completed crawl artifacts must be used:

- `artifacts/tr-crawl-state.json`
- `artifacts/en-crawl-state.json`

These files are immutable inputs.

The test framework must **not**:

- restart the crawl,
- rediscover the website,
- modify the original artifact files,
- require Playwright MCP access to the target site,
- fail development because the UAT environment is unreachable from the current machine.

---

## 3. Environment Strategy

All environment-dependent values must come from `.env`.

Example:

```env
HOSTNAME=uat-turkticaretbankasi.ttbank.local
RUN_LIVE_TESTS=false
HEADLESS=true
IGNORE_HTTPS_ERRORS=true
WORKERS=4
RETRIES=0
REQUEST_TIMEOUT_MS=30000
```

Artifact URLs may contain:

```text
https://{{hostname}}/tr/...
```

At runtime, `{{hostname}}` must be resolved using:

```ts
process.env.HOSTNAME
```

The hostname must never be hardcoded in test code.

### Personal / Development Machine

```env
RUN_LIVE_TESTS=false
```

Allowed:

- TypeScript compilation
- Artifact validation
- URL normalization checks
- Resource classification
- Offline integrity checks
- Test generation

Not allowed:

- UAT navigation
- Live HTTP validation
- Playwright MCP access to the target
- Any assumption that the target must be reachable

### Corporate Machine

```env
RUN_LIVE_TESTS=true
```

The full live test suite is executed against the real UAT environment.

---

## 4. Recommended Project Structure

```text
tests/
  offline/
    artifact-integrity.spec.ts

  live/
    01-url-health.spec.ts
    02-download-validation.spec.ts
    03-site-runtime-validation.spec.ts

src/
  config/
    env.ts

  artifacts/
    artifact-loader.ts

  types/
    crawl-state.ts
    validation-result.ts

  utils/
    url.ts
    resource-classifier.ts

  validators/
    url-health-validator.ts
    pdf-validator.ts
    download-validator.ts
    page-validator.ts
    localization-validator.ts
    network-validator.ts
    console-validator.ts

  localization/
    localization-mapper.ts

  reporting/
    site-validation-reporter.ts

artifacts/
  tr-crawl-state.json
  en-crawl-state.json
  final-test-plan.md

test-results/
  site-validation-report.json
  site-validation-report.md
```

---

# 5. Test Scenarios

## 5.1 Artifact Integrity Validation

**File**

```text
tests/offline/artifact-integrity.spec.ts
```

**Runtime**

Offline.

**Purpose**

Validate that TR and EN crawl artifacts are complete, parseable, internally consistent, and ready for live execution.

**Preconditions**

- `artifacts/tr-crawl-state.json` exists.
- `artifacts/en-crawl-state.json` exists.
- `.env` contains `HOSTNAME`.

**Steps**

1. Load both crawl artifacts.
2. Validate JSON structure.
3. Verify `crawlComplete === true`.
4. Verify `pendingUrls` is empty.
5. Validate `discoveredUrls` and `visitedUrls`.
6. Detect duplicate URLs.
7. Detect malformed URLs.
8. Validate exclusion records.
9. Validate crawl error records are readable.
10. Resolve `{{hostname}}` from `.env` without changing the artifact file.
11. Confirm the original JSON files remain unchanged.

**Expected Results**

- Both artifacts are valid.
- Both crawls are complete.
- No pending crawl items remain.
- All URLs can be parsed or clearly classified.
- Hostname replacement works.
- Artifact files remain immutable.

---

## 5.2 Internal URL Health Validation

**File**

```text
tests/live/01-url-health.spec.ts
```

**Runtime**

Live only.

If:

```env
RUN_LIVE_TESTS=false
```

the suite must be skipped cleanly.

**Purpose**

Validate every eligible internal HTML URL from the completed crawl inventory.

**Input**

- TR `discoveredUrls`
- EN `discoveredUrls`

**Steps**

1. Load all discovered URLs.
2. Resolve `{{hostname}}`.
3. Normalize and deduplicate URLs.
4. Classify resources.
5. Select only eligible internal HTML URLs.
6. Validate each URL using `APIRequestContext` where browser interaction is unnecessary.
7. Record:
   - original URL,
   - final URL,
   - HTTP status,
   - redirect information,
   - timeout,
   - connection failure.
8. Detect HTTP 4xx and 5xx.
9. Detect unexpected cross-domain redirects.
10. Detect unexpected TR → EN or EN → TR redirects where applicable.

**Expected Results**

Each internal HTML URL is classified as one of:

```text
PASS
REDIRECT
FAIL
TIMEOUT
CONNECTION_ERROR
```

---

## 5.3 Downloadable Resource Validation

**File**

```text
tests/live/02-download-validation.spec.ts
```

**Runtime**

Live only.

**Purpose**

Validate PDF, ZIP, and other downloadable resources without treating them as HTML pages.

### Resource Classification

Every discovered resource must be classified as:

```text
HTML
PDF
ZIP
DOWNLOAD
EXTERNAL
MAILTO
TEL
UNKNOWN
```

The browser condition:

```text
page.goto: Download is starting
```

must **not** automatically be classified as a broken page.

### PDF Validation

For each unique PDF URL:

1. Merge PDF inventories from TR and EN.
2. Normalize URLs.
3. Deduplicate identical PDF resources.
4. Preserve all source pages that reference the PDF.
5. Send an HTTP GET using Playwright `APIRequestContext`.
6. Validate:
   - `status === 200`
   - `Content-Type` contains `application/pdf`
   - response body length > 0
   - first bytes equal `%PDF-`
7. Detect HTML error pages returned as PDF endpoints.
8. Record:
   - PDF URL,
   - source pages,
   - status,
   - content type,
   - content length,
   - signature,
   - validation result.

**Expected Result**

Every PDF is classified as:

```text
VALID
INVALID
TIMEOUT
CONNECTION_ERROR
```

### ZIP / Other Downloads

ZIP and other downloadable resources must be validated with HTTP requests, not `page.goto()`.

Validate:

- successful HTTP response,
- non-empty body,
- reasonable content type,
- timeout / connection errors.

---

## 5.4 TR / EN Localization Mapping

**Implementation**

```text
src/localization/localization-mapper.ts
```

**Runtime**

Mapping logic should work offline.

**Purpose**

Create a conservative TR/EN page relationship model from the existing artifacts.

**Possible Classifications**

```text
PAIRED
TR_ONLY
EN_ONLY
UNMAPPED
```

**Rules**

- Do not invent page pairs.
- Do not assume Turkish and English slugs are identical.
- Do not infer a pair only because two URLs look semantically similar.
- Use deterministic artifact evidence where available.
- If evidence is insufficient, use `UNMAPPED`.
- Live language-switcher validation may later confirm or improve the mapping.

**Expected Result**

A reliable localization mapping inventory is available for live runtime validation.

---

## 5.5 Consolidated Site Runtime Validation

**File**

```text
tests/live/03-site-runtime-validation.spec.ts
```

**Runtime**

Live only.

**Purpose**

Validate each eligible HTML page with a single browser visit and collect all page-level findings in the same navigation.

**Important Performance Rule**

Each HTML page should normally be opened **once**.

Do not create separate page visits for:

- page content,
- localization,
- network,
- JavaScript errors,
- redirects,
- broken images.

Use:

```text
one navigation
+
multiple validators
```

instead of repeated navigation.

### During Each Page Visit Validate

#### Page Health

- original URL
- final URL
- redirect behavior
- page title
- `html lang`
- body is not empty
- meaningful visible content exists
- H1 exists where applicable
- header exists where applicable
- footer exists where applicable
- obvious 404 markers
- obvious 500 markers
- broken images

#### Localization

For TR pages:

- `html lang` indicates Turkish
- page title exists
- important visible UI is present
- headings exist
- buttons are not empty
- navigation labels are present
- footer labels are present
- detect obvious English UI leakage
- detect localization placeholders
- detect encoding corruption

For EN pages:

- `html lang` indicates English
- page title exists
- important visible UI is present
- headings exist
- buttons are not empty
- navigation labels are present
- footer labels are present
- detect obvious Turkish UI leakage
- detect localization placeholders
- detect encoding corruption

Suspicious patterns may include:

```text
{{key}}
common.*
translation.*
home.*
�
```

Semantic translation correctness must **not** be claimed unless an approved translation baseline exists.

Uncertain language findings should be reported as warnings instead of false failures.

#### Network Validation

During page load monitor:

```text
requestfailed
response.status() >= 400
```

Record:

- page URL
- request URL
- HTTP method
- resource type
- HTTP status
- failure reason

Focus primarily on:

- document
- xhr
- fetch
- script
- stylesheet
- font
- image where relevant

Do not silently suppress errors.

Any future ignore list must be explicit and configurable.

#### JavaScript Validation

Capture:

```text
pageerror
console.error
```

Record:

- page URL
- error type
- message

Do not use broad hardcoded ignore rules.

#### Redirect Validation

Record:

- original URL
- final URL
- redirect chain where available

Detect:

- redirect loops
- redirect to error pages
- unexpected external redirect
- unexpected language redirect

**Expected Result**

Every eligible HTML page receives one consolidated runtime validation result.

---

# 6. Reporting

**Implementation**

```text
src/reporting/site-validation-reporter.ts
```

Reporting is a reusable service, not primarily a separate test scenario.

**Outputs**

```text
test-results/site-validation-report.json
test-results/site-validation-report.md
```

The report must include:

- execution environment
- hostname
- TR discovered count
- EN discovered count
- HTML pages tested
- HTML pages passed
- HTML pages failed
- redirects
- PDF total
- PDF valid
- PDF invalid
- ZIP/download total
- broken links
- HTTP 4xx
- HTTP 5xx
- timeout failures
- connection failures
- network errors
- console errors
- page errors
- localization warnings
- `PAIRED`
- `TR_ONLY`
- `EN_ONLY`
- `UNMAPPED`
- excluded URLs
- unvalidated URLs

Detailed failure records must include enough information to reproduce the problem.

The report must never contain:

- cookies
- access tokens
- Authorization headers
- session IDs
- sensitive request bodies

---

# 7. Coverage Validation

Coverage validation is mandatory.

At the end of execution calculate:

```text
eligibleDiscoveredUrls
-
validatedUrls
-
explicitlyExcludedUrls
```

Expected result:

```text
EMPTY SET
```

Any remaining URL must be reported as:

```text
UNVALIDATED
```

No URL should silently disappear from coverage.

---

# 8. Live / Offline Execution Rules

## Offline

Recommended commands:

```bash
npm install
npm run typecheck
npm run test:offline
```

Offline execution must not require UAT connectivity.

## Live

Recommended commands:

```bash
npm install
npx playwright install chromium
npm run typecheck
npm run test:live
```

Live execution requires:

```env
RUN_LIVE_TESTS=true
```

---

# 9. Recommended package.json Scripts

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test:offline": "playwright test tests/offline",
    "test:live": "playwright test tests/live",
    "test:health": "playwright test tests/live/01-url-health.spec.ts",
    "test:downloads": "playwright test tests/live/02-download-validation.spec.ts",
    "test:runtime": "playwright test tests/live/03-site-runtime-validation.spec.ts"
  }
}
```

---

# 10. Generator Agent Implementation Requirements

The Generator Agent must implement the solution in small phases.

## Phase 1 — Foundation

Implement or improve:

```text
src/config/env.ts
src/types/crawl-state.ts
src/types/validation-result.ts
src/artifacts/artifact-loader.ts
src/utils/url.ts
src/utils/resource-classifier.ts
```

Requirements:

- `.env` support
- `HOSTNAME`
- `RUN_LIVE_TESTS`
- `{{hostname}}` runtime replacement
- URL normalization
- resource classification
- immutable artifact loading

Run:

```bash
npx tsc --noEmit
```

Do not run live UAT tests.

---

## Phase 2 — URL Health

Implement:

```text
src/validators/url-health-validator.ts
tests/live/01-url-health.spec.ts
```

Requirements:

- consume artifact inventory
- no fresh crawl
- API-level URL health validation
- redirect handling
- 4xx / 5xx
- timeout
- connection errors
- skip safely when `RUN_LIVE_TESTS=false`

---

## Phase 3 — Downloads

Implement:

```text
src/validators/pdf-validator.ts
src/validators/download-validator.ts
tests/live/02-download-validation.spec.ts
```

Requirements:

- PDF validation
- ZIP validation
- other downloadable resource validation
- no `page.goto()` for downloads
- PDF deduplication
- preserve all source pages

---

## Phase 4 — Localization Mapping

Implement:

```text
src/localization/localization-mapper.ts
```

Requirements:

- `PAIRED`
- `TR_ONLY`
- `EN_ONLY`
- `UNMAPPED`
- conservative mapping
- no invented pairs
- offline-capable

---

## Phase 5 — Runtime Validation

Implement:

```text
src/validators/page-validator.ts
src/validators/localization-validator.ts
src/validators/network-validator.ts
src/validators/console-validator.ts
tests/live/03-site-runtime-validation.spec.ts
```

Requirements:

- one page navigation
- multiple validators
- page health
- localization
- network
- console
- page errors
- redirects
- broken images
- no repeated page loading per validation category

---

## Phase 6 — Reporting

Implement:

```text
src/reporting/site-validation-reporter.ts
```

Generate:

```text
test-results/site-validation-report.json
test-results/site-validation-report.md
```

Include coverage calculation and all major validation categories.

---

# 11. Acceptance Criteria

The implementation is complete when:

1. TR and EN crawl artifacts remain unchanged.
2. No fresh crawl is required.
3. The project compiles with `npx tsc --noEmit`.
4. Offline validation works without UAT access.
5. Live tests are skipped when `RUN_LIVE_TESTS=false`.
6. Live tests run when `RUN_LIVE_TESTS=true`.
7. Every eligible internal HTML URL is validated.
8. Every unique PDF is validated.
9. ZIP/download resources are not misclassified as HTML failures.
10. Each HTML page is normally opened only once during runtime validation.
11. Page content, localization, network, JS, redirects, and images are validated in that single visit.
12. TR/EN mappings are conservative and never invented.
13. Reports are generated in JSON and Markdown.
14. No sensitive headers, tokens, cookies, or request bodies are written to reports.
15. Final coverage check returns no unexplained unvalidated URL.

---

# 12. Final Rule

The target UAT site being unreachable from the current development machine is **not a blocker**.

Development should rely on:

```text
TR artifact
+
EN artifact
+
TypeScript compilation
+
offline checks
```

The final implementation will be pushed to GitHub and executed on the corporate machine where the target environment is reachable.
