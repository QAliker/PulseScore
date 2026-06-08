import { ArticleCard } from './article-card';
import type { Article } from '@/lib/news';

/**
 * Editorial feed: one large lead story, then a two-column run of
 * secondary stories with hairline dividers. Avoids uniform card grids.
 */
export function NewsList({ articles }: { articles: Article[] }) {
  if (!articles.length) return null;
  const [lead, ...rest] = articles;

  return (
    <div className="flex flex-col gap-9">
      <ArticleCard article={lead} variant="lead" />

      {rest.length > 0 && (
        <div className="grid gap-x-10 sm:grid-cols-2">
          {rest.map((a) => (
            <div
              key={a.id}
              className="border-b border-border/50 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0"
            >
              <ArticleCard article={a} variant="list" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
