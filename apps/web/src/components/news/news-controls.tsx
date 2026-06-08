'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { NEWS_CATEGORIES, type NewsCategory } from '@/lib/news';

type Props = { category: NewsCategory; q: string };

export function NewsControls({ category, q }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(q);

  function navigate(next: { category?: NewsCategory; q?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.category !== undefined) {
      if (next.category === 'all') params.delete('category');
      else params.set('category', next.category);
    }
    if (next.q !== undefined) {
      if (!next.q) params.delete('q');
      else params.set('q', next.q);
    }
    params.delete('page'); // any control change returns to page 1
    const qs = params.toString();
    router.push(qs ? `/news?${qs}` : '/news');
  }

  return (
    <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-center @3xl:justify-between">
      <div
        role="tablist"
        aria-label="News categories"
        className="flex gap-1 self-start rounded-xl border border-border/50 bg-muted/30 p-1"
      >
        {NEWS_CATEGORIES.map((c) => {
          const active = c.id === category;
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={active}
              onClick={() => !active && navigate({ category: c.id })}
              className={`rounded-lg px-3 py-1.5 text-[0.78rem] font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ q: term.trim() || null });
        }}
        className="group relative self-start @3xl:w-72"
        role="search"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70 transition-colors group-focus-within:text-primary" />
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search football news"
          aria-label="Search football news"
          className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        {term && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setTerm('');
              if (q) navigate({ q: null });
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3.5" />
          </button>
        )}
      </form>
    </div>
  );
}
