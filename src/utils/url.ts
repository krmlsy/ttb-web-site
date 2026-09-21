export function displayUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return `${url.pathname}${url.search}` || '/';
  } catch {
    return rawUrl;
  }
}

export function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)];
}
