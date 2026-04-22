import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { apiFetch } from '@/lib/api';
import type { ApiTeam, ApiPlayer, ApiMatch } from '@/lib/api-types';
import { TeamHeader } from '@/components/teams/team-header';
import { PlayerCard } from '@/components/teams/player-card';
import { MatchHistory } from '@/components/matches/match-history';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamId: string }>;
}): Promise<Metadata> {
  const { teamId } = await params;
  try {
    const team = await apiFetch<ApiTeam>(`/teams/${teamId}`);
    return { title: team.name };
  } catch {
    return { title: 'Team' };
  }
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  let team: ApiTeam | null = null;
  let players: ApiPlayer[] = [];
  let results: ApiMatch[] = [];
  let fixtures: ApiMatch[] = [];

  try {
    [team, players, results, fixtures] = await Promise.all([
      apiFetch<ApiTeam>(`/teams/${teamId}`),
      apiFetch<ApiPlayer[]>(`/teams/${teamId}/players`),
      apiFetch<ApiMatch[]>(`/teams/${teamId}/results?limit=10`),
      apiFetch<ApiMatch[]>(`/teams/${teamId}/fixtures`),
    ]);
  } catch {
    if (!team) notFound();
  }

  if (!team) notFound();

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        All matches
      </Link>

      <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-8">
        <TeamHeader team={team} />
      </div>

      {players.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading>Squad ({players.length})</SectionHeading>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((p) => (
              <PlayerCard key={p.externalId} player={p} />
            ))}
          </div>
        </section>
      )}

      {results.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading>Recent Results</SectionHeading>
          <div className="rounded-xl border border-border/60 bg-card px-4 sm:px-6">
            <MatchHistory matches={results} teamId={teamId} />
          </div>
        </section>
      )}

      {fixtures.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading>Upcoming Fixtures</SectionHeading>
          <div className="rounded-xl border border-border/60 bg-card px-4 sm:px-6">
            <MatchHistory matches={fixtures} teamId={teamId} emptyMessage="No upcoming fixtures." />
          </div>
        </section>
      )}

      {players.length === 0 && results.length === 0 && fixtures.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Full team data available once the API is seeded.
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
