import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ApiPlayer } from '@/lib/api-types';
import Image from 'next/image';

const POSITION_COLOR: Record<string, string> = {
  Goalkeeper: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  Defender: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  Midfielder: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  Forward: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

type Props = { player: ApiPlayer };

export function PlayerCard({ player }: Props) {
  const posColor = player.position ? (POSITION_COLOR[player.position] ?? 'bg-muted text-muted-foreground') : 'bg-muted text-muted-foreground';

  return (
    <Link
      href={`/players/${player.externalId}`}
      className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-3 transition-colors hover:bg-accent/40"
    >
      <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-muted">
        {player.image ? (
          <Image src={player.image} alt={player.name} className="size-full object-cover" loading="lazy" width={30} height={30}/>
        ) : (
          <span className="flex size-full items-center justify-center text-xs font-bold text-muted-foreground">
            {player.number ?? '?'}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold group-hover:underline">{player.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          {player.position && (
            <span className={cn('rounded px-1.5 py-0.5 text-[0.65rem] font-semibold', posColor)}>
              {player.position}
            </span>
          )}
          {player.number && (
            <span className="text-[0.68rem] text-muted-foreground">#{player.number}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
        <span className="text-xs font-bold">{player.goals}G</span>
        <span className="text-[0.65rem] text-muted-foreground">{player.assists}A</span>
      </div>
    </Link>
  );
}
