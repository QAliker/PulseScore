'use client';

import { useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';
import { getTeamNews, type Article } from '@/lib/news';
import { ArticleCard } from '@/components/news/article-card';

type State =
  | { status: 'loading' }
  | { status: 'ready'; articles: Article[] }
  | { status: 'error' };

/** Lazily fetches Guardian articles tagged for this team when the tab opens. */
export function TeamNews({ teamId }: { teamId: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    getTeamNews(teamId)
      .then((feed) => {
        if (!cancelled) setState({ status: 'ready', articles: feed.articles });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (state.status === 'loading') {
    return (
      <div className="flex flex-col divide-y divide-border/50" aria-busy>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 py-4 first:pt-0">
            <div className="size-[5.5rem] shrink-0 animate-pulse rounded-xl bg-muted sm:size-24" />
            <div className="flex flex-1 flex-col gap-2 pt-1">
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (state.status === 'error' || state.articles.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-6 py-12 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted/60">
          <Newspaper className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No recent coverage</p>
        <p className="max-w-[40ch] text-xs text-muted-foreground">
          {state.status === 'error'
            ? 'Could not load news right now. Try again shortly.'
            : "No articles tagged for this club yet. Check the main News page for the wider football wire."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border/50">
      {state.articles.map((a) => (
        <ArticleCard key={a.id} article={a} variant="list" />
      ))}
    </div>
  );
}
