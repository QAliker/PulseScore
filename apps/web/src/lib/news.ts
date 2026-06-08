import { apiFetch } from './api';

export type NewsCategory = 'all' | 'transfers' | 'results' | 'team-news';

export type Article = {
  id: string;
  title: string;
  trailText: string | null;
  url: string;
  thumbnail: string | null;
  byline: string | null;
  published: string; // ISO 8601
  section: string;
};

export type NewsFeed = {
  articles: Article[];
  page: number;
  totalPages: number;
};

export const NEWS_CATEGORIES: { id: NewsCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'transfers', label: 'Transfers' },
  { id: 'results', label: 'Match Reports' },
  { id: 'team-news', label: 'Team News' },
];

export function normalizeCategory(value?: string): NewsCategory {
  return value === 'transfers' || value === 'results' || value === 'team-news'
    ? value
    : 'all';
}

export function getNews(
  params: { category?: NewsCategory; page?: number; q?: string } = {},
  init?: RequestInit & { next?: { revalidate?: number } },
): Promise<NewsFeed> {
  const search = new URLSearchParams();
  if (params.category && params.category !== 'all')
    search.set('category', params.category);
  if (params.page && params.page > 1) search.set('page', String(params.page));
  if (params.q) search.set('q', params.q);
  const qs = search.toString();
  return apiFetch<NewsFeed>(`/news${qs ? `?${qs}` : ''}`, init);
}

export function getTeamNews(
  teamId: string,
  init?: RequestInit & { next?: { revalidate?: number } },
): Promise<NewsFeed> {
  return apiFetch<NewsFeed>(`/teams/${teamId}/news`, init);
}

const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const ABS_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** "3 hours ago" within a week, absolute date beyond. */
export function formatPublished(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.round((then - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return 'just now';
  if (abs < 3600) return RELATIVE.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return RELATIVE.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 604800) return RELATIVE.format(Math.round(diffSec / 86400), 'day');
  return ABS_DATE.format(then);
}

/** Guardian bylines arrive as "Jamie Jackson" or "Jamie Jackson and David Hytner". */
export function cleanByline(byline: string | null): string | null {
  if (!byline) return null;
  const trimmed = byline.trim();
  return trimmed.length ? trimmed : null;
}
