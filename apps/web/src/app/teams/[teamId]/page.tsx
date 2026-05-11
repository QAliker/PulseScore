import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { apiFetch } from '@/lib/api';
import type { ApiTeam, ApiPlayer, ApiMatch, ApiCoach, ApiVenue, ApiInjury, ApiTransfers } from '@/lib/api-types';
import { TeamHeader } from '@/components/teams/team-header';
import { PlayerCard } from '@/components/teams/player-card';
import { MatchHistory } from '@/components/matches/match-history';
import { CoachCard } from '@/components/teams/coach-card';
import { VenueCard } from '@/components/teams/venue-card';
import { TransfersTimeline } from '@/components/player/transfers-timeline';

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
  let coaches: ApiCoach[] = [];
  let venues: ApiVenue[] = [];
  let injuries: ApiInjury[] = [];
  let teamTransfers: ApiTransfers[] = [];

  try {
    [team, players, results, fixtures, coaches, venues, injuries, teamTransfers] =
      await Promise.all([
        apiFetch<ApiTeam>(`/teams/${teamId}`),
        apiFetch<ApiPlayer[]>(`/teams/${teamId}/players`),
        apiFetch<ApiMatch[]>(`/teams/${teamId}/results?limit=10`),
        apiFetch<ApiMatch[]>(`/teams/${teamId}/fixtures`),
        apiFetch<ApiCoach[]>(`/teams/${teamId}/coach`).catch(() => [] as ApiCoach[]),
        apiFetch<ApiVenue[]>(`/teams/${teamId}/venues`).catch(() => [] as ApiVenue[]),
        apiFetch<ApiInjury[]>(`/teams/${teamId}/injuries`).catch(() => [] as ApiInjury[]),
        apiFetch<ApiTransfers[]>(`/teams/${teamId}/transfers`).catch(() => [] as ApiTransfers[]),
      ]);
  } catch {
    if (!team) notFound();
  }

  if (!team) notFound();

  const venue = venues[0] ?? null;

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

      {/* Coach + Venue side by side on wide, stacked on narrow */}
      {(coaches.length > 0 || venue) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {coaches.length > 0 && (
            <section className="flex flex-col gap-2">
              <SectionHeading>Manager</SectionHeading>
              <div className="rounded-xl border border-border/60 bg-card">
                <CoachCard coaches={coaches} />
              </div>
            </section>
          )}

          {venue && (
            <section className="flex flex-col gap-2">
              <SectionHeading>Stadium</SectionHeading>
              <VenueCard venue={venue} />
            </section>
          )}
        </div>
      )}

      {injuries.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading>Current Injuries ({injuries.length})</SectionHeading>
          <div className="rounded-xl border border-border/60 bg-card px-4 sm:px-6">
            <ul className="flex flex-col divide-y divide-border/40">
              {injuries.map((inj, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{inj.playerName}</span>
                    <span className="text-[0.72rem] text-muted-foreground">
                      {inj.type}{inj.reason ? ` · ${inj.reason}` : ''}
                    </span>
                  </div>
                  <time className="shrink-0 text-[0.72rem] tabular text-muted-foreground">
                    {inj.fixtureDate?.slice(0, 10) ?? ''}
                  </time>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

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

      {teamTransfers.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading>Recent Transfers</SectionHeading>
          <div className="rounded-xl border border-border/60 bg-card">
            {teamTransfers.slice(0, 5).map((transfer) => (
              <TransfersTimeline key={transfer.playerId} transfers={transfer} />
            ))}
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
