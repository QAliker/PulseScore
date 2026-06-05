import Link from 'next/link';
import Image from 'next/image';
import { Trophy } from 'lucide-react';
import type { League } from '@/lib/leagues';

type ChampionCardProps = {
  league: League;
  teamName: string;
  teamBadge: string | null;
  teamId?: string;
};

export function ChampionCard({ league, teamName, teamBadge, teamId }: ChampionCardProps) {
  const inner = (
    <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.10] to-amber-500/[0.02] px-6 py-12 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-48 rounded-full bg-amber-400/20 blur-3xl"
      />
      <div className="relative flex size-14 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-500/30">
        <Trophy className="size-7 text-amber-500" />
      </div>
      <p className="relative text-[0.7rem] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
        Champions {league.season}
      </p>
      <div className="relative flex flex-col items-center gap-3">
        {teamBadge && (
          <Image
            src={teamBadge}
            alt={teamName}
            width={72}
            height={72}
            className="h-[72px] w-[72px] object-contain drop-shadow-sm"
            unoptimized
          />
        )}
        <h3 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          {teamName}
        </h3>
      </div>
      <p className="relative text-xs text-muted-foreground">
        {league.name} · Season complete
      </p>
    </div>
  );

  return teamId ? (
    <Link href={`/teams/${teamId}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
      {inner}
    </Link>
  ) : (
    inner
  );
}
