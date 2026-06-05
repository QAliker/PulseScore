'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { LineupPlayer, TeamLineup, Match } from '@/lib/types';
import { PlayerPhoto } from './player-photo';

type Props = {
  lineups: { home: TeamLineup; away: TeamLineup };
  match: Match;
};

const POSITION_MAP: Record<string, string> = {
  GK: 'GK', CB: 'CB', LB: 'LB', RB: 'RB', LWB: 'LWB', RWB: 'RWB',
  CDM: 'CDM', CM: 'CM', CAM: 'CAM', LM: 'LM', RM: 'RM',
  LW: 'LW', RW: 'RW', ST: 'ST', CF: 'CF', SS: 'SS',
  D: 'DEF', M: 'MID', F: 'FWD',
};

function formatPosition(label: string): string {
  return POSITION_MAP[label.toUpperCase()] ?? label.toUpperCase();
}

function groupByRow(players: LineupPlayer[]): [number, LineupPlayer[]][] {
  const map = new Map<number, LineupPlayer[]>();
  for (const p of players) {
    const row = p.positionRow ?? 0;
    if (!map.has(row)) map.set(row, []);
    map.get(row)!.push(p);
  }
  for (const arr of map.values()) arr.sort((a, b) => a.positionCol - b.positionCol);
  return Array.from(map.entries()).sort(([a], [b]) => a - b);
}

function PlayerRow({ player, side }: { player: LineupPlayer; side: 'home' | 'away' }) {
  // Only players resolved to an FDO person id have a player page (see backend
  // linkLineupPlayersToFdo). Others keep their ESPN id and stay non-clickable.
  const href = player.id.startsWith('fdo:') ? `/players/${player.id}` : null;

  const content = (
    <>
      <span className="w-5 shrink-0 text-right text-[0.7rem] font-black tabular text-muted-foreground/50 leading-none">
        {player.number || '—'}
      </span>
      <PlayerPhoto photo={player.photo} name={player.name} number={player.number} side={side} size="md" />
      <span className="flex-1 truncate text-[0.825rem] font-semibold leading-snug">
        {player.name}
      </span>
      {player.positionLabel && (
        <span
          className={cn(
            'shrink-0 rounded px-1.5 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.1em]',
            side === 'home' ? 'bg-home/10 text-home' : 'bg-away/10 text-away',
          )}
        >
          {formatPosition(player.positionLabel)}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="-mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
      </Link>
    );
  }

  return <div className="flex items-center gap-2.5 py-1.5">{content}</div>;
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="h-px flex-1 bg-border/40" />
      <span className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-muted-foreground/60">
        {label}
      </span>
      <div className="h-px flex-1 bg-border/40" />
    </div>
  );
}

function TeamColumn({ lineup, teamName, side }: { lineup: TeamLineup; teamName: string; side: 'home' | 'away' }) {
  const startingRows = groupByRow(lineup.starting);

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span
          className={cn(
            'text-xs font-black leading-tight tracking-tight',
            side === 'home' ? 'text-home' : 'text-away',
          )}
        >
          {teamName}
        </span>
        {lineup.formation && (
          <span className="text-[0.7rem] font-black tabular text-muted-foreground/60">
            {lineup.formation}
          </span>
        )}
      </div>

      <div className="flex flex-col divide-y divide-border/20">
        {startingRows.map(([, players]) =>
          players.map((p) => <PlayerRow key={p.id} player={p} side={side} />),
        )}
      </div>

      {lineup.bench.length > 0 && (
        <>
          <SectionDivider label="Bench" />
          <div className="flex flex-col divide-y divide-border/15 opacity-55">
            {lineup.bench.map((p) => (
              <PlayerRow key={p.id} player={p} side={side} />
            ))}
          </div>
        </>
      )}

      {lineup.coach && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-border/30 pt-2.5">
          <span className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-muted-foreground/60">
            Coach
          </span>
          <span className="text-[0.8rem] font-semibold">{lineup.coach}</span>
        </div>
      )}
    </div>
  );
}

export function LineupCards({ lineups, match }: Props) {
  return (
    <div className="grid grid-cols-2 gap-0">
      <div className="pr-4 sm:pr-6">
        <TeamColumn lineup={lineups.home} teamName={match.home.name} side="home" />
      </div>
      <div className="border-l border-border/30 pl-4 sm:pl-6">
        <TeamColumn lineup={lineups.away} teamName={match.away.name} side="away" />
      </div>
    </div>
  );
}
