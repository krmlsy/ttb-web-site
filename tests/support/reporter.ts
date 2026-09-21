import fs from 'node:fs';
import path from 'node:path';

export interface CoverageSummary {
  eligibleDiscoveredUrls: string[];
  validatedUrls: string[];
  explicitlyExcludedUrls: string[];
  unvalidated: string[];
  complete: boolean;
}

export function calculateCoverage(
  discovered: string[],
  validated: string[],
  excluded: string[] = [],
): CoverageSummary {
  const eligible = [...new Set(discovered)];
  const validatedSet = new Set(validated);
  const excludedSet = new Set(excluded);
  const unvalidated = eligible.filter((url) => !validatedSet.has(url) && !excludedSet.has(url));

  return {
    eligibleDiscoveredUrls: eligible,
    validatedUrls: [...validatedSet],
    explicitlyExcludedUrls: [...excludedSet],
    unvalidated,
    complete: unvalidated.length === 0,
  };
}

export function writeJsonReport(filePath: string, payload: unknown): void {
  const resolved = path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export function writeMarkdownReport(filePath: string, markdown: string): void {
  const resolved = path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, markdown, 'utf8');
}
