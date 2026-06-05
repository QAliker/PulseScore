import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { apiFetch } from '@/lib/api';
import type { ApiPlayerDetail, ApiTransfers, ApiTrophy, ApiSidelined, ApiMatch } from '@/lib/api-types';
import { PlayerHeroCard } from '@/components/player/player-hero-card';
import { TransfersTimeline } from '@/components/player/transfers-timeline';
import { TrophiesSection } from '@/components/player/trophies-section';
import { SidelinedSection } from '@/components/player/sidelined-section';
import { MatchHistory } from '@/components/matches/match-history';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ playerId: string }>;
}): Promise<Metadata> {
  const { playerId } = await params;
  try {
    const player = await apiFetch<ApiPlayerDetail>(`/players/${playerId}`);
    return { title: player.name };
  } catch {
    return { title: 'Player' };
  }
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;

  let player: ApiPlayerDetail | null = null;

  try {
    player = await apiFetch<ApiPlayerDetail>(`/players/${playerId}`);
  } catch {
    notFound();
  }

  if (!player) notFound();

  const [transfers, trophies, sidelined, recentMatches] = await Promise.all([
    apiFetch<ApiTransfers>(`/players/${playerId}/transfers`).catch(() => null),
    apiFetch<ApiTrophy[]>(`/players/${playerId}/trophies`).catch(() => [] as ApiTrophy[]),
    apiFetch<ApiSidelined[]>(`/players/${playerId}/sidelined`).catch(() => [] as ApiSidelined[]),
    player.teamId
      ? apiFetch<ApiMatch[]>(`/teams/${player.teamId}/results?limit=5`).catch(() => [] as ApiMatch[])
      : Promise.resolve([] as ApiMatch[]),
  ]);

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <Link
        href={player.teamId ? `/teams/${player.teamId}` : '/'}
        className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        {player.teamName ?? 'Back'}
      </Link>

      <PlayerHeroCard player={player} />

      {recentMatches.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading>Recent matches</SectionHeading>
          <div className="rounded-xl border border-border/60 bg-card px-4 sm:px-6">
            <MatchHistory
              matches={recentMatches}
              teamId={player.teamId ?? undefined}
            />
          </div>
        </section>
      )}

      {transfers && transfers.transfers.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading>Transfer history</SectionHeading>
          <div className="rounded-xl border border-border/60 bg-card py-1">
            <TransfersTimeline transfers={transfers} />
          </div>
        </section>
      )}

      {trophies.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading>Trophies ({trophies.length})</SectionHeading>
          <div className="rounded-xl border border-border/60 bg-card py-1">
            <TrophiesSection trophies={trophies} />
          </div>
        </section>
      )}

      {sidelined.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading>Injury history</SectionHeading>
          <div className="rounded-xl border border-border/60 bg-card py-1">
            <SidelinedSection sidelined={sidelined} />
          </div>
        </section>
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
