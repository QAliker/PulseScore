const API_BASE =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { next?: { revalidate?: number } },
): Promise<T> {
  const defaults = init?.cache ? {} : { next: { revalidate: 300 } };
  const res = await fetch(`${API_BASE}${path}`, {
    ...defaults,
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText}: ${path}`);
  }
  return res.json() as Promise<T>;
}
