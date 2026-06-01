import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { apiFetch } from '@/lib/api';
import type {
  ApiTeam,
  ApiPlayer,
  ApiMatch,
  ApiCoach,
  ApiVenue,
  ApiInjury,
  ApiTransfers,
  ApiTeamStanding,
} from '@/lib/api-types';
import { extractLogoColor } from '@/lib/extract-color';
import { TeamHeroCard } from '@/components/teams/team-hero-card';
import { TeamTabs } from '@/components/teams/team-tabs';

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
  let standing: ApiTeamStanding | null = null;
  let squadUnavailable = false;
  let matchesUnavailable = false;
  let coachUnavailable = false;
  let transfersUnavailable = false;

  const safe = <T,>(promise: Promise<T[]>) =>
    promise.catch((): T[] | null => null);

  try {
    const [t, p, inj, r, f, c, v, tr, s] = await Promise.all([
      apiFetch<ApiTeam>(`/teams/${teamId}`),
      safe(apiFetch<ApiPlayer[]>(`/teams/${teamId}/players`)),
      safe(apiFetch<ApiInjury[]>(`/teams/${teamId}/injuries`)),
      safe(apiFetch<ApiMatch[]>(`/teams/${teamId}/results?limit=10`)),
      safe(apiFetch<ApiMatch[]>(`/teams/${teamId}/fixtures`)),
      safe(apiFetch<ApiCoach[]>(`/teams/${teamId}/coach`)),
      safe(apiFetch<ApiVenue[]>(`/teams/${teamId}/venues`)),
      safe(apiFetch<ApiTransfers[]>(`/teams/${teamId}/transfers`)),
      apiFetch<ApiTeamStanding>(`/teams/${teamId}/standing`).catch(() => null),
    ]);
    team = t;
    squadUnavailable = p === null || inj === null;
    matchesUnavailable = r === null || f === null;
    coachUnavailable = c === null || v === null;
    transfersUnavailable = tr === null;
    players = p ?? [];
    injuries = inj ?? [];
    results = r ?? [];
    fixtures = f ?? [];
    coaches = c ?? [];
    venues = v ?? [];
    teamTransfers = tr ?? [];
    standing = s;
  } catch {
    if (!team) notFound();
  }

  if (!team) notFound();

  const teamColor = team.logo ? await extractLogoColor(team.logo).catch(() => null) : null;
  const venue = venues[0] ?? null;

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        Retour
      </Link>

      <TeamHeroCard
        team={team}
        standing={standing}
        results={results}
        teamColor={teamColor}
      />

      <TeamTabs
        players={players}
        results={results}
        fixtures={fixtures}
        coaches={coaches}
        venue={venue}
        injuries={injuries}
        teamTransfers={teamTransfers}
        teamId={teamId}
        squadUnavailable={squadUnavailable}
        matchesUnavailable={matchesUnavailable}
        coachUnavailable={coachUnavailable}
        transfersUnavailable={transfersUnavailable}
      />
    </div>
  );
}
