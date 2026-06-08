import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, Newspaper } from 'lucide-react';
import {
  getNews,
  normalizeCategory,
  NEWS_CATEGORIES,
  type NewsCategory,
} from '@/lib/news';
import { NewsControls } from '@/components/news/news-controls';
import { NewsList } from '@/components/news/news-list';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Football News',
  description:
    'Transfers, match reports and team news from across world football.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function buildHref(category: NewsCategory, q: string, page: number): string {
  const params = new URLSearchParams();
  if (category !== 'all') params.set('category', category);
  if (q) params.set('q', q);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/news?${qs}` : '/news';
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const category = normalizeCategory(first(sp.category));
  const q = first(sp.q)?.trim() ?? '';
  const pageParam = Number.parseInt(first(sp.page) ?? '1', 10);
  const page = Number.isNaN(pageParam) ? 1 : Math.max(1, pageParam);

  const feed = await getNews(
    { category, page, q },
    { next: { revalidate: 600 } },
  ).catch(() => ({ articles: [], page, totalPages: 1 }));

  const activeLabel =
    NEWS_CATEGORIES.find((c) => c.id === category)?.label ?? 'All';
  const hasPrev = feed.page > 1;
  const hasNext = feed.page < feed.totalPages;

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-7 px-4 py-6 lg:px-8 lg:py-9">
      <header className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-primary">
          <Newspaper className="size-3.5" />
          The Wire
        </p>
        <h1 className="font-display text-[clamp(2rem,1.4rem+2.6vw,3rem)] font-extrabold leading-none tracking-tight">
          Football News
        </h1>
        <p className="max-w-[60ch] text-sm text-muted-foreground">
          Transfers, match reports and the latest from around the grounds —
          curated from{' '}
          <a
            href="https://www.theguardian.com/football"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-primary"
          >
            the Guardian
          </a>
          .
        </p>
      </header>

      <div className="@container">
        <NewsControls category={category} q={q} />
      </div>

      {feed.articles.length > 0 ? (
        <>
          <NewsList articles={feed.articles} />

          {(hasPrev || hasNext) && (
            <nav
              aria-label="Pagination"
              className="mt-2 flex items-center justify-between border-t border-border/60 pt-5"
            >
              <PageLink
                href={buildHref(category, q, feed.page - 1)}
                disabled={!hasPrev}
                dir="prev"
              >
                Newer
              </PageLink>
              <span className="tabular text-[0.78rem] text-muted-foreground">
                Page {feed.page} of {feed.totalPages}
              </span>
              <PageLink
                href={buildHref(category, q, feed.page + 1)}
                disabled={!hasNext}
                dir="next"
              >
                Older
              </PageLink>
            </nav>
          )}
        </>
      ) : (
        <EmptyState category={activeLabel} q={q} />
      )}

      <p className="mt-2 text-[0.7rem] text-muted-foreground/70">
        Powered by{' '}
        <a
          href="https://open-platform.theguardian.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-border underline-offset-2 hover:text-foreground"
        >
          the Guardian Open Platform
        </a>
        . Articles open on theguardian.com.
      </p>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  dir,
  children,
}: {
  href: string;
  disabled: boolean;
  dir: 'prev' | 'next';
  children: React.ReactNode;
}) {
  const inner = (
    <>
      {dir === 'prev' && <ArrowLeft className="size-4" />}
      {children}
      {dir === 'next' && <ArrowRight className="size-4" />}
    </>
  );
  const base =
    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.82rem] font-semibold';
  if (disabled) {
    return (
      <span className={`${base} cursor-not-allowed text-muted-foreground/35`}>
        {inner}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`${base} text-foreground transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
    >
      {inner}
    </Link>
  );
}

function EmptyState({ category, q }: { category: string; q: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted/60">
        <Newspaper className="size-5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-display text-lg font-bold tracking-tight">
          No stories right now
        </p>
        <p className="max-w-[42ch] text-sm text-muted-foreground">
          {q
            ? `Nothing matching “${q}” in ${category}. Try a different search or category.`
            : `The ${category} wire is quiet. Check back shortly — it refreshes through the day.`}
        </p>
      </div>
      {q && (
        <Link
          href="/news"
          className="mt-1 rounded-lg bg-primary px-3.5 py-1.5 text-[0.8rem] font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Clear search
        </Link>
      )}
    </div>
  );
}
