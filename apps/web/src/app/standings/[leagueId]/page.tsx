import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { apiFetch } from '@/lib/api';
import { LEAGUES } from '@/lib/leagues';
import type { ApiStanding } from '@/lib/api-types';
import { StandingTable } from '@/components/standings/standing-table';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}): Promise<Metadata> {
  const { leagueId } = await params;
  const league = LEAGUES.find((l) => String(l.apiFootballId) === leagueId);
  return { title: league ? `${league.name} Standings` : 'Standings' };
}

export default async function StandingsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  const league = LEAGUES.find((l) => String(l.apiFootballId) === leagueId);
  if (!league) notFound();

  let standings: ApiStanding[] = [];
  try {
    standings = await apiFetch<ApiStanding[]>(`/leagues/${leagueId}/standings`);
  } catch {
    standings = [];
  }

  return (
    <div className="mx-auto flex max-w-225 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        All matches
      </Link>

      <header className="flex flex-col gap-1">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {league.flag} {league.country}
        </p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          {league.name} Standings
        </h1>
        <p className="text-sm text-muted-foreground">{league.season}</p>
      </header>

      <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
        {standings.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Standings unavailable — API key required.
          </p>
        ) : (
          <StandingTable standings={standings} />
        )}
      </div>

      <div className="flex gap-3">
        <Link
          href={`/results?league=${leagueId}`}
          className="rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-semibold hover:bg-accent/60 transition-colors"
        >
          Recent Results
        </Link>
        <Link
          href={`/fixtures?league=${leagueId}`}
          className="rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-semibold hover:bg-accent/60 transition-colors"
        >
          Upcoming Fixtures
        </Link>
      </div>
    </div>
  );
}
