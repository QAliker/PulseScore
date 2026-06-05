'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, Loader2 } from 'lucide-react';
import { LEAGUES } from '@/lib/leagues';
import { LeagueLogo } from '@/components/feed/league-logo';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type TeamResult = {
  id: string;
  name: string;
  logo: string | null;
  country: string | null;
};

type Item =
  | { type: 'league'; slug: string; name: string; country: string; href: string }
  | { type: 'team'; id: string; name: string; logo: string | null; country: string | null; href: string };

export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [teams, setTeams] = useState<TeamResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open with ⌘K / Ctrl+K from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setActive(0);
      // Focus after the dialog paints.
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery('');
      setTeams([]);
    }
  }, [open]);

  // Debounced team search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setTeams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/teams?search=${encodeURIComponent(q)}`,
          { signal: ctrl.signal },
        );
        const data: TeamResult[] = res.ok ? await res.json() : [];
        setTeams(data);
      } catch {
        // Ignore aborted/failed requests.
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const leagueMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LEAGUES;
    return LEAGUES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) || l.country.toLowerCase().includes(q),
    );
  }, [query]);

  const items = useMemo<Item[]>(() => {
    const leagues: Item[] = leagueMatches.map((l) => ({
      type: 'league',
      slug: l.slug,
      name: l.name,
      country: l.country,
      href: `/leagues/${l.slug}`,
    }));
    const teamItems: Item[] = teams.map((t) => ({
      type: 'team',
      id: t.id,
      name: t.name,
      logo: t.logo,
      country: t.country,
      href: `/teams/${t.id}`,
    }));
    return [...leagues, ...teamItems];
  }, [leagueMatches, teams]);

  useEffect(() => {
    setActive(0);
  }, [items.length]);

  const select = useCallback(
    (item: Item | undefined) => {
      if (!item) return;
      setOpen(false);
      router.push(item.href);
    },
    [router],
  );

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const firstTeamIndex = leagueMatches.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden min-w-55 items-center gap-2 rounded-md border border-input bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary md:flex"
      >
        <Search className="size-4" aria-hidden />
        <span>Search teams, leagues</span>
        <kbd className="ml-auto rounded bg-background/60 px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      {/* Mobile trigger */}
      <button
        type="button"
        aria-label="Search"
        onClick={() => setOpen(true)}
        className="flex size-9 items-center justify-center rounded-md border border-input bg-secondary/50 text-muted-foreground transition-colors hover:bg-secondary md:hidden"
      >
        <Search className="size-4" aria-hidden />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[560px] overflow-hidden rounded-xl border border-border/60 bg-popover shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border/60 px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search teams, leagues…"
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {loading && (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
              )}
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-2">
              {items.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {query.trim().length < 2
                    ? 'Type at least 2 characters…'
                    : 'No results.'}
                </p>
              ) : (
                <>
                  {leagueMatches.length > 0 && (
                    <Group label="Leagues" />
                  )}
                  {leagueMatches.map((l, i) => (
                    <Row
                      key={`l-${l.slug}`}
                      activeId={active === i}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => select(items[i])}
                    >
                      <LeagueLogo league={l} size={20} className="size-5" />
                      <span className="flex-1 truncate">{l.name}</span>
                      <span className="text-xs text-muted-foreground">{l.country}</span>
                    </Row>
                  ))}

                  {teams.length > 0 && <Group label="Teams" />}
                  {teams.map((t, i) => {
                    const idx = firstTeamIndex + i;
                    return (
                      <Row
                        key={`t-${t.id}`}
                        activeId={active === idx}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => select(items[idx])}
                      >
                        {t.logo ? (
                          <Image
                            src={t.logo}
                            alt=""
                            width={20}
                            height={20}
                            className="size-5 object-contain"
                            unoptimized
                          />
                        ) : (
                          <span className="size-5" />
                        )}
                        <span className="flex-1 truncate">{t.name}</span>
                        {t.country && (
                          <span className="text-xs text-muted-foreground">{t.country}</span>
                        )}
                      </Row>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Group({ label }: { label: string }) {
  return (
    <p className="px-3 pb-1 pt-2 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
      {label}
    </p>
  );
}

function Row({
  children,
  activeId,
  onClick,
  onMouseEnter,
}: {
  children: React.ReactNode;
  activeId: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors ${
        activeId ? 'bg-accent text-accent-foreground' : 'text-foreground'
      }`}
    >
      {children}
    </button>
  );
}
