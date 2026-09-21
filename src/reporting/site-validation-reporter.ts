import type { CoverageSummary } from '../types/validation-result';

export function calculateCoverage(
  discovered: string[],
  validated: string[],
  excluded: string[] = [],
): CoverageSummary {
  const eligible = [...new Set(discovered)];
  const validatedSet = new Set(validated);
  const excludedSet = new Set(excluded);
  const unvalidated = eligible.filter(
    (url) => !validatedSet.has(url) && !excludedSet.has(url),
  );

  return {
    eligibleDiscoveredUrls: eligible,
    validatedUrls: [...validatedSet],
    explicitlyExcludedUrls: [...excludedSet],
    unvalidated,
    complete: unvalidated.length === 0,
  };
}
