import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { apiFetch } from '@/lib/api';
import { LEAGUES, type League } from '@/lib/leagues';
import type { ApiMatch, ApiSeason, ApiStanding } from '@/lib/api-types';
import { getCurrentRound } from '@/lib/rounds';
import { MatchHistory } from '@/components/matches/match-history';
import { RoundSelector } from '@/components/feed/round-selector';
import { LeagueLogo } from '@/components/feed/league-logo';
import { ChampionCard } from '@/components/leagues/champion-card';

type Champion = { teamName: string; teamBadge: string | null; teamId?: string };

function computeChampion(
  season: ApiSeason | null,
  standings: ApiStanding[],
): Champion | null {
  if (!season?.finished) return null;
  const byName = season.winnerName
    ? standings.find((s) => s.teamName === season.winnerName)
    : undefined;
  const top = standings.find((s) => s.position === 1) ?? standings[0];
  const src = byName ?? top;
  const teamName = season.winnerName ?? src?.teamName ?? '';
  if (!teamName) return null;
  return { teamName, teamBadge: src?.teamBadge ?? null, teamId: src?.teamId };
}

function LeagueLabel({ league }: { league: League }) {
  return (
    <h3 className="flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      <LeagueLogo league={league} size={32} className="size-8" />
      {league.name}
    </h3>
  );
}

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Fixtures' };

export default async function FixturesPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string; round?: string; all?: string }>;
}) {
  const { league: leagueFilter, round: roundParam, all: showAll } = await searchParams;
  const roundFilter = roundParam ? parseInt(roundParam, 10) : null;

  const activeLeague = leagueFilter
    ? LEAGUES.find((l) => String(l.apiFootballId) === leagueFilter)
    : null;

  const leaguesToFetch = activeLeague ? [activeLeague] : LEAGUES;

  const fixtureGroups = await Promise.all(
    leaguesToFetch.map(async (league) => {
      const [matches, season] = await Promise.all([
        apiFetch<ApiMatch[]>(`/leagues/${league.apiFootballId}/fixtures`).catch(
          () => [] as ApiMatch[],
        ),
        apiFetch<ApiSeason | null>(`/leagues/${league.apiFootballId}/season`).catch(
          () => null,
        ),
      ]);
      let champion: Champion | null = null;
      if (season?.finished) {
        const standings = await apiFetch<ApiStanding[]>(
          `/leagues/${league.apiFootballId}/standings`,
        ).catch(() => [] as ApiStanding[]);
        champion = computeChampion(season, standings);
      }
      return { league, matches, champion };
    }),
  );

  // Collect all unique rounds across fetched leagues, sorted ascending.
  const allRounds = Array.from(
    new Set(
      fixtureGroups.flatMap(({ matches }) =>
        matches.map((m) => m.round).filter((r): r is number => r != null),
      ),
    ),
  ).sort((a, b) => a - b);

  // Auto-redirect to current round only when a specific league is selected.
  // For all-leagues view, different leagues are at different rounds — a global min
  // would leave some leagues showing empty.
  if (!roundParam && !showAll && activeLeague) {
    const leagueMatches = fixtureGroups.find((g) => g.league.slug === activeLeague.slug)?.matches ?? [];
    const defaultRound = getCurrentRound(leagueMatches);
    if (defaultRound != null) {
      const params = new URLSearchParams();
      params.set('round', String(defaultRound));
      params.set('league', leagueFilter!);
      redirect(`/fixtures?${params.toString()}`);
    }
  }

  // Filter matches by selected round.
  const filteredGroups = fixtureGroups.map(({ league, matches, champion }) => ({
    league,
    champion,
    matches: roundFilter != null ? matches.filter((m) => m.round === roundFilter) : matches,
  }));

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        All matches
      </Link>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Fixtures</h1>
          <div className="flex gap-2">
            <Link
              href="/fixtures"
              className={`rounded-full px-3.5 py-1.5 text-[0.78rem] font-semibold transition-colors ${!leagueFilter ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
            >
              All
            </Link>
            {LEAGUES.map((l) => (
              <Link
                key={l.slug}
                href={`/fixtures?league=${l.apiFootballId}${roundFilter != null ? `&round=${roundFilter}` : ''}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.78rem] font-semibold transition-colors ${leagueFilter === String(l.apiFootballId) ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LeagueLogo league={l} size={16} className="size-4" />
                {l.name}
              </Link>
            ))}
          </div>
        </div>

        <RoundSelector
          rounds={allRounds}
          currentRound={roundFilter}
          showAll={!!showAll}
          extraParams={leagueFilter ? { league: leagueFilter } : undefined}
          basePath="/fixtures"
        />
      </div>

      {filteredGroups.map(({ league, matches, champion }) => (
        <section key={league.slug} className="flex flex-col gap-2">
          <LeagueLabel league={league} />
          {champion ? (
            <ChampionCard
              league={league}
              teamName={champion.teamName}
              teamBadge={champion.teamBadge}
              teamId={champion.teamId}
            />
          ) : (
            <div className="rounded-xl border border-border/60 bg-card px-4 sm:px-6">
              <MatchHistory
                matches={matches}
                emptyMessage="No fixtures in this round."
                groupByRound={roundFilter == null}
              />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
