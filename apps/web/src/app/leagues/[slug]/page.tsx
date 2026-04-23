import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { apiFetch } from '@/lib/api';
import { LEAGUES } from '@/lib/leagues';
import type { ApiStanding, ApiMatch } from '@/lib/api-types';
import { StandingTable } from '@/components/standings/standing-table';
import { MatchHistory } from '@/components/matches/match-history';
import { RoundSelector } from '@/components/feed/round-selector';

export const dynamic = 'force-dynamic';

type Tab = 'standings' | 'results' | 'fixtures';

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

  const tab: Tab =
    rawTab === 'results' || rawTab === 'fixtures' ? rawTab : 'standings';

  const fixturesPromise = apiFetch<ApiMatch[]>(`/leagues/${league.apiFootballId}/fixtures`);

  const [standingsResult, matchesResult, fixturesResult] = await Promise.allSettled([
    tab === 'standings'
      ? apiFetch<ApiStanding[]>(`/leagues/${league.apiFootballId}/standings`)
      : Promise.resolve([] as ApiStanding[]),
    tab === 'results'
      ? apiFetch<ApiMatch[]>(`/leagues/${league.apiFootballId}/results`)
      : Promise.resolve([] as ApiMatch[]),
    fixturesPromise,
  ]);

  const standings = standingsResult.status === 'fulfilled' ? standingsResult.value : [];
  const fixtureMatches = fixturesResult.status === 'fulfilled' ? fixturesResult.value : [];
  const rawMatches =
    tab === 'fixtures'
      ? fixtureMatches
      : matchesResult.status === 'fulfilled'
        ? matchesResult.value
        : [];
  const logo = fixtureMatches[0]?.league?.logo ?? null;

  const allRounds = Array.from(
    new Set(rawMatches.map((m) => m.round).filter((r): r is number => r != null)),
  ).sort((a, b) => (tab === 'results' ? b - a : a - b));

  const matches =
    roundFilter != null ? rawMatches.filter((m) => m.round === roundFilter) : rawMatches;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'standings', label: 'Classement' },
    { id: 'results', label: 'Résultats' },
    { id: 'fixtures', label: 'Fixtures' },
  ];

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <Link
        href="/leagues"
        className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        Toutes les ligues
      </Link>

      <header className="flex items-center gap-4">
        {logo ? (
          <Image
            src={logo}
            alt={league.name}
            width={56}
            height={56}
            className="size-14 object-contain"
            unoptimized
          />
        ) : (
          <span className="text-5xl leading-none">{league.flag}</span>
        )}
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

      <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
        {tab === 'standings' && (
          standings.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Classement indisponible — clé API requise.
            </p>
          ) : (
            <StandingTable standings={standings} />
          )
        )}
        {(tab === 'results' || tab === 'fixtures') && (
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
                  ? 'Aucun résultat — clé API requise.'
                  : 'Aucun match à venir — clé API requise.'
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
