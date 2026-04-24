import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { apiFetch } from '@/lib/api';
import type { ApiPlayerDetail } from '@/lib/api-types';
import Image from 'next/image';

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

const POSITION_COLOR: Record<string, string> = {
  Goalkeeper: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  Defender: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  Midfielder: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  Forward: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

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

  const posColor =
    player.position
      ? (POSITION_COLOR[player.position] ?? 'bg-muted text-muted-foreground')
      : 'bg-muted text-muted-foreground';

  return (
    <div className="mx-auto flex max-w-150 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <Link
        href={player.teamId ? `/teams/${player.teamId}` : '/'}
        className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        {player.teamName ?? 'Back'}
      </Link>

      <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-muted sm:size-24">
            {player.image ? (
              <Image
                src={player.image}
                alt={player.name}
                className="size-full object-cover"
                loading="lazy"
                width={20} height={20}
              />
            ) : (
              <span className="flex size-full items-center justify-center text-2xl font-black text-muted-foreground">
                {player.number ?? '?'}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {player.position && (
                <span className={`rounded px-2 py-0.5 text-xs font-semibold ${posColor}`}>
                  {player.position}
                </span>
              )}
              {player.number && (
                <span className="text-sm text-muted-foreground">#{player.number}</span>
              )}
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {player.name}
            </h1>
            {player.teamName && (
              <p className="text-sm font-medium text-muted-foreground">{player.teamName}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[
          { label: 'Goals', value: player.goals },
          { label: 'Assists', value: player.assists },
          { label: 'Played', value: player.matchesPlayed },
          { label: 'Yellow', value: player.yellowCards },
          { label: 'Red', value: player.redCards },
          { label: 'Rating', value: player.rating ?? '—' },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-card p-3"
          >
            <span className="text-xl font-black tabular">{value}</span>
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
      </div>

      {player.age && (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <DetailRow label="Age" value={String(player.age)} />
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className="font-semibold tabular">{value}</span>
    </div>
  );
}
