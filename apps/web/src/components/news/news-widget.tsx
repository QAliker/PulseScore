import Link from 'next/link';
import { getNews } from '@/lib/news';
import { ArticleCard } from './article-card';

/** "Latest" news block for the home rail. Fails silently to nothing. */
export async function NewsWidget() {
  const feed = await getNews(
    { category: 'all' },
    { next: { revalidate: 600 } },
  ).catch(() => ({ articles: [], page: 1, totalPages: 1 }));

  if (feed.articles.length < 2) return null;

  const [lead, ...rest] = feed.articles;
  const secondary = rest.slice(0, 4);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Latest
        </h2>
        <Link
          href="/news"
          className="text-[0.76rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          All news →
        </Link>
      </div>

      <ArticleCard article={lead} variant="rail" />

      <div className="flex flex-col divide-y divide-border/70">
        {secondary.map((a) => (
          <div key={a.id} className="py-3 first:pt-1 last:pb-0">
            <ArticleCard article={a} variant="compact" />
          </div>
        ))}
      </div>
    </section>
  );
}
