const API_BASE =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

export class RateLimitError extends Error {
  constructor(path: string) {
    super(`Rate limited: ${path}`);
    this.name = 'RateLimitError';
  }
}

export function isRateLimitError(e: unknown): e is RateLimitError {
  return e instanceof RateLimitError || (e instanceof Error && e.name === 'RateLimitError');
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { next?: { revalidate?: number } },
): Promise<T> {
  const defaults = init?.cache ? {} : { next: { revalidate: 300 } };
  const res = await fetch(`${API_BASE}${path}`, {
    ...defaults,
    ...init,
  });
  if (res.status === 429) {
    throw new RateLimitError(path);
  }
  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText}: ${path}`);
  }
  return res.json() as Promise<T>;
}
