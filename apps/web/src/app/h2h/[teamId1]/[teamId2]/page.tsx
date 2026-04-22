import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { apiFetch } from '@/lib/api';
import type { ApiTeam, ApiH2h } from '@/lib/api-types';
import { MatchHistory } from '@/components/matches/match-history';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Head to Head' };

export default async function H2HPage({
  params,
}: {
  params: Promise<{ teamId1: string; teamId2: string }>;
}) {
  const { teamId1, teamId2 } = await params;

  let h2h: ApiH2h | null = null;
  let team1: ApiTeam | null = null;
  let team2: ApiTeam | null = null;

  try {
    [h2h, team1, team2] = await Promise.all([
      apiFetch<ApiH2h>(`/h2h/${teamId1}/${teamId2}`),
      apiFetch<ApiTeam>(`/teams/${teamId1}`).catch(() => null),
      apiFetch<ApiTeam>(`/teams/${teamId2}`).catch(() => null),
    ]);
  } catch {
    notFound();
  }

  if (!h2h) notFound();

  const team1Name = team1?.name ?? 'Team 1';
  const team2Name = team2?.name ?? 'Team 2';

  const wins1 = h2h.headToHead.filter(
    (m) =>
      m.status === 'FINISHED' &&
      m.homeScore != null &&
      m.awayScore != null &&
      ((m.homeTeam.externalId === teamId1 && m.homeScore > m.awayScore) ||
        (m.awayTeam.externalId === teamId1 && m.awayScore > m.homeScore)),
  ).length;

  const wins2 = h2h.headToHead.filter(
    (m) =>
      m.status === 'FINISHED' &&
      m.homeScore != null &&
      m.awayScore != null &&
      ((m.homeTeam.externalId === teamId2 && m.homeScore > m.awayScore) ||
        (m.awayTeam.externalId === teamId2 && m.awayScore > m.homeScore)),
  ).length;

  const draws = h2h.headToHead.filter(
    (m) =>
      m.status === 'FINISHED' &&
      m.homeScore != null &&
      m.awayScore != null &&
      m.homeScore === m.awayScore,
  ).length;

  const total = wins1 + wins2 + draws;

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        All matches
      </Link>

      <header>
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Head to Head
        </p>
        <h1 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
          {team1Name} vs {team2Name}
        </h1>
      </header>

      {total > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="mb-3 flex justify-between text-sm font-bold">
            <span>{wins1}W</span>
            <span className="text-muted-foreground">{draws}D</span>
            <span>{wins2}W</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            {wins1 > 0 && (
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${(wins1 / total) * 100}%` }}
              />
            )}
            {draws > 0 && (
              <div
                className="h-full bg-muted-foreground/40"
                style={{ width: `${(draws / total) * 100}%` }}
              />
            )}
            {wins2 > 0 && (
              <div
                className="h-full bg-blue-500"
                style={{ width: `${(wins2 / total) * 100}%` }}
              />
            )}
          </div>
          <div className="mt-3 flex justify-between text-[0.68rem] text-muted-foreground">
            <span>{team1Name}</span>
            <span>{team2Name}</span>
          </div>
        </div>
      )}

      {h2h.headToHead.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading>Direct Meetings</SectionHeading>
          <div className="rounded-xl border border-border/60 bg-card px-4 sm:px-6">
            <MatchHistory matches={h2h.headToHead} />
          </div>
        </section>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {h2h.firstTeamResults.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionHeading>{team1Name} — Recent</SectionHeading>
            <div className="rounded-xl border border-border/60 bg-card px-4">
              <MatchHistory matches={h2h.firstTeamResults.slice(0, 5)} teamId={teamId1} />
            </div>
          </section>
        )}

        {h2h.secondTeamResults.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionHeading>{team2Name} — Recent</SectionHeading>
            <div className="rounded-xl border border-border/60 bg-card px-4">
              <MatchHistory matches={h2h.secondTeamResults.slice(0, 5)} teamId={teamId2} />
            </div>
          </section>
        )}
      </div>

      {h2h.headToHead.length === 0 && h2h.firstTeamResults.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          H2H data available once the API is seeded.
        </p>
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </h2>
  );
}
