import { cn } from '@/lib/utils';
import type { LineupPlayer, TeamLineup, Match } from '@/lib/types';

type Props = {
  lineups: { home: TeamLineup; away: TeamLineup };
  match: Match;
};

function groupByRow(players: LineupPlayer[]): Map<number, LineupPlayer[]> {
  const map = new Map<number, LineupPlayer[]>();
  for (const p of players) {
    if (!map.has(p.positionRow)) map.set(p.positionRow, []);
    map.get(p.positionRow)!.push(p);
  }
  for (const arr of map.values()) arr.sort((a, b) => a.positionCol - b.positionCol);
  return map;
}

function PlayerDot({
  player,
  side,
}: {
  player: LineupPlayer;
  side: 'home' | 'away';
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          'flex size-8 items-center justify-center rounded-full text-xs font-bold tabular ring-2',
          side === 'home'
            ? 'bg-home text-primary-foreground ring-home/40'
            : 'bg-away text-away-foreground ring-away/40',
        )}
        title={`${player.number} ${player.name}`}
      >
        {player.number}
      </div>
      <span className="w-14 truncate text-center text-[0.58rem] font-medium leading-tight text-pitch-foreground/80">
        {player.name.split(' ').pop()}
      </span>
    </div>
  );
}

function FormationHalf({
  lineup,
  side,
  mirror,
}: {
  lineup: TeamLineup;
  side: 'home' | 'away';
  mirror: boolean;
}) {
  const byRow = groupByRow(lineup.starting);
  const rowKeys = Array.from(byRow.keys()).sort((a, b) => (mirror ? a - b : b - a));

  return (
    <div className="flex flex-1 flex-col justify-around py-2">
      {rowKeys.map((row) => (
        <div key={row} className="flex justify-around">
          {byRow.get(row)!.map((p) => (
            <PlayerDot key={p.id} player={p} side={side} />
          ))}
        </div>
      ))}
    </div>
  );
}

function BenchRow({ lineup, side }: { lineup: TeamLineup; side: 'home' | 'away' }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
        Bench
      </span>
      <div className="flex flex-wrap gap-2">
        {lineup.bench.map((p) => (
          <div
            key={p.id}
            className={cn(
              'flex items-center gap-1.5 rounded-md border border-border/60 bg-card px-2 py-1',
            )}
          >
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold',
                side === 'home'
                  ? 'bg-home/20 text-home'
                  : 'bg-away/20 text-away',
              )}
            >
              {p.number}
            </span>
            <span className="text-[0.72rem] font-medium">{p.name}</span>
            <span className="text-[0.6rem] text-muted-foreground">{p.positionLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PitchFormation({ lineups, match }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {/* Formation header: team names + formation string */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{match.home.name}</span>
          <span className="font-display text-sm font-bold">{lineups.home.formation}</span>
        </div>
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Formation</span>
        <div className="flex flex-col items-end text-right">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{match.away.name}</span>
          <span className="font-display text-sm font-bold">{lineups.away.formation}</span>
        </div>
      </div>

      {/* Pitch */}
      <div
        className="pitch-grass relative overflow-hidden rounded-xl"
        style={{ aspectRatio: '3 / 4' }}
        role="img"
        aria-label={`${match.home.name} ${lineups.home.formation} vs ${match.away.name} ${lineups.away.formation} formation`}
      >
        {/* Field line overlay */}
        <div className="pointer-events-none absolute inset-0">
          {/* Penalty areas */}
          <div className="absolute left-[20%] right-[20%] top-[4%] h-[18%] rounded-sm border border-pitch-foreground/25" />
          <div className="absolute bottom-[4%] left-[20%] right-[20%] h-[18%] rounded-sm border border-pitch-foreground/25" />
          {/* Center line */}
          <div className="absolute inset-x-[5%] top-1/2 h-px -translate-y-px bg-pitch-foreground/30" />
          {/* Center circle */}
          <div className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-pitch-foreground/25" />
          {/* Center spot */}
          <div className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pitch-foreground/50" />
        </div>

        {/* Away half (top) — GK at top, FWDs near center */}
        <div className="absolute inset-x-0 top-0 flex h-1/2 flex-col pb-1 pt-2">
          <FormationHalf lineup={lineups.away} side="away" mirror />
        </div>

        {/* Home half (bottom) — FWDs near center, GK at bottom */}
        <div className="absolute inset-x-0 bottom-0 flex h-1/2 flex-col pt-1 pb-2">
          <FormationHalf lineup={lineups.home} side="home" mirror={false} />
        </div>
      </div>

      {/* Coaches */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Coach</span>
          <p className="font-medium">{lineups.home.coach}</p>
        </div>
        <div className="text-right">
          <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Coach</span>
          <p className="font-medium">{lineups.away.coach}</p>
        </div>
      </div>

      {/* Benches — side by side */}
      <div className="grid grid-cols-2 gap-6">
        <BenchRow lineup={lineups.home} side="home" />
        <BenchRow lineup={lineups.away} side="away" />
      </div>
    </div>
  );
}
