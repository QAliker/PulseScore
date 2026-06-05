import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { apiFetch } from '@/lib/api';
import { LEAGUES } from '@/lib/leagues';
import type { ApiStanding, ApiMatch, ApiScorer, ApiSeason } from '@/lib/api-types';
import { ChampionCard } from '@/components/leagues/champion-card';
import { StandingTable } from '@/components/standings/standing-table';
import { MatchHistory } from '@/components/matches/match-history';
import { RoundSelector } from '@/components/feed/round-selector';
import { LeagueLogo } from '@/components/feed/league-logo';
import { ScorersBoard } from '@/components/scorers/scorers-board';
import { WorldCupView, type CupTab } from '@/components/world-cup/world-cup-view';

export const dynamic = 'force-dynamic';

type Tab = 'standings' | 'results' | 'fixtures' | 'scorers';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const league = LEAGUES.find((l) => l.slug === slug);
  return { title: league ? league.name : 'League' };
}

export default async function LeagueSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; round?: string }>;
}) {
  const [{ slug }, { tab: rawTab, round: roundParam }] = await Promise.all([params, searchParams]);
  const roundFilter = roundParam ? parseInt(roundParam, 10) : null;

  const league = LEAGUES.find((l) => l.slug === slug);
  if (!league) notFound();

  if (league.isCup) {
    const cupTab: CupTab =
      rawTab === 'bracket' || rawTab === 'scorers' || rawTab === 'results'
        ? rawTab
        : 'groups';

    const [groupsResult, matchesResult, scorersResult] = await Promise.allSettled([
      cupTab === 'groups'
        ? apiFetch<ApiStanding[]>(`/leagues/${league.apiFootballId}/groups`)
        : Promise.resolve([] as ApiStanding[]),
      cupTab === 'bracket' || cupTab === 'results'
        ? apiFetch<ApiMatch[]>(`/leagues/${league.apiFootballId}/matches`)
        : Promise.resolve([] as ApiMatch[]),
      cupTab === 'scorers'
        ? apiFetch<ApiScorer[]>(`/leagues/${league.apiFootballId}/scorers`)
        : Promise.resolve([] as ApiScorer[]),
    ]);

    return (
      <WorldCupView
        league={league}
        slug={slug}
        tab={cupTab}
        groups={groupsResult.status === 'fulfilled' ? groupsResult.value : []}
        matches={matchesResult.status === 'fulfilled' ? matchesResult.value : []}
        scorers={scorersResult.status === 'fulfilled' ? scorersResult.value : []}
      />
    );
  }

  const tab: Tab =
    rawTab === 'results' || rawTab === 'fixtures' || rawTab === 'scorers'
      ? rawTab
      : 'standings';

  const [standingsResult, matchesResult, fixturesResult, scorersResult, seasonResult] =
    await Promise.allSettled([
      tab === 'standings' || tab === 'fixtures'
        ? apiFetch<ApiStanding[]>(`/leagues/${league.apiFootballId}/standings`)
        : Promise.resolve([] as ApiStanding[]),
      tab === 'results'
        ? apiFetch<ApiMatch[]>(`/leagues/${league.apiFootballId}/results`)
        : Promise.resolve([] as ApiMatch[]),
      tab === 'fixtures'
        ? apiFetch<ApiMatch[]>(`/leagues/${league.apiFootballId}/fixtures`)
        : Promise.resolve([] as ApiMatch[]),
      tab === 'scorers'
        ? apiFetch<ApiScorer[]>(`/leagues/${league.apiFootballId}/scorers`)
        : Promise.resolve([] as ApiScorer[]),
      tab === 'fixtures'
        ? apiFetch<ApiSeason | null>(`/leagues/${league.apiFootballId}/season`)
        : Promise.resolve(null),
    ]);

  const standings = standingsResult.status === 'fulfilled' ? standingsResult.value : [];
  const scorers = scorersResult.status === 'fulfilled' ? scorersResult.value : [];

  const season =
    seasonResult.status === 'fulfilled' ? seasonResult.value : null;

  const champion = (() => {
    if (tab !== 'fixtures' || !season?.finished) return null;
    const byName = season.winnerName
      ? standings.find((s) => s.teamName === season.winnerName)
      : undefined;
    const top = standings.find((s) => s.position === 1) ?? standings[0];
    const src = byName ?? top;
    const teamName = season.winnerName ?? src?.teamName ?? '';
    if (!teamName) return null;
    return { teamName, teamBadge: src?.teamBadge ?? null, teamId: src?.teamId };
  })();
  const fixtureMatches = fixturesResult.status === 'fulfilled' ? fixturesResult.value : [];
  const rawMatches =
    tab === 'fixtures'
      ? fixtureMatches
      : matchesResult.status === 'fulfilled'
        ? matchesResult.value
        : [];

  const allRounds = Array.from(
    new Set(rawMatches.map((m) => m.round).filter((r): r is number => r != null)),
  ).sort((a, b) => (tab === 'results' ? b - a : a - b));

  const matches =
    roundFilter != null ? rawMatches.filter((m) => m.round === roundFilter) : rawMatches;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'standings', label: 'Standings' },
    { id: 'scorers', label: 'Scorers' },
    { id: 'results', label: 'Results' },
    { id: 'fixtures', label: 'Fixtures' },
  ];

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <Link
        href="/leagues"
        className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        All leagues
      </Link>

      <header className="flex items-center gap-4">
        <LeagueLogo league={league} size={56} className="size-14" />
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {league.country} · {league.season}
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {league.name}
          </h1>
        </div>
      </header>

      <nav className="flex gap-1 rounded-xl border border-border/60 bg-card p-1">
        {tabs.map(({ id, label }) => (
          <Link
            key={id}
            href={`/leagues/${slug}?tab=${id}`}
            className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold transition-colors ${
              tab === id
                ? 'bg-foreground text-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === 'scorers' && <ScorersBoard scorers={scorers} league={league} />}

      {tab !== 'scorers' && (
      <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
        {tab === 'standings' && (
          standings.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Standings unavailable — API key required.
            </p>
          ) : (
            <StandingTable standings={standings} />
          )
        )}
        {(tab === 'results' || tab === 'fixtures') && (
          champion ? (
            <ChampionCard
              league={league}
              teamName={champion.teamName}
              teamBadge={champion.teamBadge}
              teamId={champion.teamId}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <RoundSelector
                rounds={allRounds}
                currentRound={roundFilter}
                extraParams={{ tab }}
                basePath={`/leagues/${slug}`}
              />
              <MatchHistory
                matches={matches}
                groupByRound={roundFilter == null}
                emptyMessage={
                  tab === 'results'
                    ? 'No results — API key required.'
                    : 'No upcoming matches — API key required.'
                }
              />
            </div>
          )
        )}
      </div>
      )}
    </div>
  );
}
