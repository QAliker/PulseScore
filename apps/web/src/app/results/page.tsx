import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { apiFetch } from '@/lib/api';
import { LEAGUES } from '@/lib/leagues';
import type { ApiMatch } from '@/lib/api-types';
import { MatchHistory } from '@/components/matches/match-history';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Results' };

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>;
}) {
  const { league: leagueFilter } = await searchParams;

  const activeLeague = leagueFilter
    ? LEAGUES.find((l) => String(l.apiFootballId) === leagueFilter)
    : null;

  const leaguesToFetch = activeLeague ? [activeLeague] : LEAGUES;

  const results = await Promise.all(
    leaguesToFetch.map(async (league) => {
      try {
        const data = await apiFetch<ApiMatch[]>(`/leagues/${league.apiFootballId}/results`);
        return { league, matches: data };
      } catch {
        return { league, matches: [] as ApiMatch[] };
      }
    }),
  );

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        All matches
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Results</h1>
        <div className="flex gap-2">
          <Link
            href="/results"
            className={`rounded-full px-3.5 py-1.5 text-[0.78rem] font-semibold transition-colors ${!leagueFilter ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
          >
            All
          </Link>
          {LEAGUES.map((l) => (
            <Link
              key={l.slug}
              href={`/results?league=${l.apiFootballId}`}
              className={`rounded-full px-3.5 py-1.5 text-[0.78rem] font-semibold transition-colors ${leagueFilter === String(l.apiFootballId) ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {l.flag} {l.name}
            </Link>
          ))}
        </div>
      </div>

      {results.map(({ league, matches }) => (
        <section key={league.slug} className="flex flex-col gap-3">
          <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {league.flag} {league.name}
          </h2>
          <div className="rounded-xl border border-border/60 bg-card px-4 sm:px-6">
            <MatchHistory
              matches={matches}
              emptyMessage="No recent results — API key required."
            />
          </div>
        </section>
      ))}
    </div>
  );
}
