import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function asBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function asPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function asNonNegativeInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const hostname = required('HOSTNAME').replace(/^https?:\/\//i, '').replace(/\/+$/, '');

export const env = {
  hostname,
  baseUrl: `https://${hostname}`,
  headless: asBoolean(process.env.HEADLESS, true),
  ignoreHttpsErrors: asBoolean(process.env.IGNORE_HTTPS_ERRORS, true),
  workers: asPositiveInt(process.env.WORKERS, 4),
  retries: asNonNegativeInt(process.env.RETRIES, 0),
  requestTimeoutMs: asPositiveInt(process.env.REQUEST_TIMEOUT_MS, 30_000),
  runLiveTests: asBoolean(process.env.RUN_LIVE_TESTS, false),
} as const;
