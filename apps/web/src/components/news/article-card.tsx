import Image from 'next/image';
import { ArrowUpRight, Newspaper } from 'lucide-react';
import type { Article } from '@/lib/news';
import { formatPublished, cleanByline } from '@/lib/news';

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-primary">
      {children}
    </span>
  );
}

function Meta({ article }: { article: Article }) {
  const byline = cleanByline(article.byline);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.72rem] text-muted-foreground">
      {byline && <span className="font-medium text-foreground/70">{byline}</span>}
      {byline && <span aria-hidden className="text-border">·</span>}
      <time dateTime={article.published} className="tabular">
        {formatPublished(article.published)}
      </time>
    </div>
  );
}

function Thumb({
  article,
  className,
  sizes,
}: {
  article: Article;
  className: string;
  sizes: string;
}) {
  if (!article.thumbnail) {
    return (
      <div
        className={`flex items-center justify-center bg-secondary text-muted-foreground/40 ${className}`}
      >
        <Newspaper className="size-1/4" />
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={article.thumbnail}
        alt=""
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
      />
    </div>
  );
}

type Variant = 'lead' | 'list' | 'compact' | 'rail';

/**
 * Editorial article link. `lead` = featured story with large image,
 * `list` = newspaper "more stories" row, `compact` = home-widget row.
 * All open the original Guardian article in a new tab.
 */
export function ArticleCard({
  article,
  variant = 'list',
}: {
  article: Article;
  variant?: Variant;
}) {
  const common =
    'group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  if (variant === 'lead') {
    return (
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${common} @container rounded-2xl`}
      >
        <article className="grid gap-4 @[34rem]:grid-cols-[1.15fr_1fr] @[34rem]:items-center @[34rem]:gap-7">
          <Thumb
            article={article}
            className="aspect-[16/10] w-full rounded-2xl"
            sizes="(max-width: 900px) 100vw, 560px"
          />
          <div className="flex flex-col gap-3">
            <Kicker>{article.section}</Kicker>
            <h2 className="font-display text-[clamp(1.55rem,1.1rem+2vw,2.4rem)] font-extrabold leading-[1.04] tracking-tight text-balance group-hover:text-primary">
              {article.title}
            </h2>
            {article.trailText && (
              <p className="line-clamp-3 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
                {article.trailText}
              </p>
            )}
            <div className="mt-1 flex items-center justify-between gap-3">
              <Meta article={article} />
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
            </div>
          </div>
        </article>
      </a>
    );
  }

  if (variant === 'compact') {
    return (
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${common} flex items-start gap-3 rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-accent/40`}
      >
        <Thumb
          article={article}
          className="size-14 shrink-0 rounded-lg"
          sizes="56px"
        />
        <div className="flex min-w-0 flex-col gap-1 pt-0.5">
          <h3 className="line-clamp-2 text-[0.84rem] font-semibold leading-snug tracking-tight group-hover:text-primary">
            {article.title}
          </h3>
          <time
            dateTime={article.published}
            className="tabular text-[0.68rem] text-muted-foreground"
          >
            {formatPublished(article.published)}
          </time>
        </div>
      </a>
    );
  }

  if (variant === 'rail') {
    return (
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${common} block`}
      >
        <article className="flex flex-col gap-2.5">
          <Thumb
            article={article}
            className="aspect-[16/9] w-full rounded-xl"
            sizes="(max-width: 1024px) 100vw, 320px"
          />
          <div className="flex flex-col gap-1.5">
            <Kicker>{article.section}</Kicker>
            <h3 className="line-clamp-3 font-display text-[1.05rem] font-extrabold leading-[1.12] tracking-tight text-balance group-hover:text-primary">
              {article.title}
            </h3>
            <Meta article={article} />
          </div>
        </article>
      </a>
    );
  }

  // list
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${common} flex items-start gap-4 py-4 first:pt-0`}
    >
      <Thumb
        article={article}
        className="size-[5.5rem] shrink-0 rounded-xl sm:size-24"
        sizes="96px"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Kicker>{article.section}</Kicker>
        <h3 className="line-clamp-2 font-display text-base font-bold leading-[1.2] tracking-tight group-hover:text-primary sm:text-lg">
          {article.title}
        </h3>
        {article.trailText && (
          <p className="line-clamp-1 hidden text-[0.82rem] text-muted-foreground sm:block">
            {article.trailText}
          </p>
        )}
        <Meta article={article} />
      </div>
      <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
    </a>
  );
}
