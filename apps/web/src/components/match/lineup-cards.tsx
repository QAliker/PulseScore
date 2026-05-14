'use client';

import Image from 'next/image';
import type { LineupPlayer, TeamLineup, Match } from '@/lib/types';

type Props = {
  lineups: { home: TeamLineup; away: TeamLineup };
  match: Match;
};

const POSITION_MAP: Record<string, string> = {
  GK: 'Gardien',
  CB: 'Déf. Central',
  LB: 'Arr. Gauche',
  RB: 'Arr. Droit',
  LWB: 'Piston G.',
  RWB: 'Piston D.',
  CDM: 'Mil. Défensif',
  CM: 'Milieu',
  CAM: 'Mil. Offensif',
  LM: 'Mil. Gauche',
  RM: 'Mil. Droit',
  LW: 'Ailier G.',
  RW: 'Ailier D.',
  ST: 'Attaquant',
  CF: 'Avant-Centre',
  SS: '2e Attaquant',
  D: 'Défenseur',
  M: 'Milieu',
  F: 'Attaquant',
};

function formatPosition(label: string): string {
  return POSITION_MAP[label.toUpperCase()] ?? label;
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

function PlayerAvatar({ photo, name }: { photo?: string | null; name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (!photo) {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[0.55rem] font-bold text-muted-foreground">
        {initials}
      </span>
    );
  }

  return (
    <span className="relative flex h-7 w-7 shrink-0 overflow-hidden rounded-full bg-muted">
      <Image
        src={photo}
        alt={name}
        fill
        sizes="28px"
        className="object-cover object-top"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
        unoptimized
      />
      <span className="absolute inset-0 flex items-center justify-center text-[0.55rem] font-bold text-muted-foreground">
        {initials}
      </span>
    </span>
  );
}

function PlayerRow({
  player,
  side,
}: {
  player: LineupPlayer;
  side: 'home' | 'away';
}) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span
        className={`w-5 shrink-0 text-right text-[0.7rem] font-bold tabular leading-none ${side === 'home' ? 'text-home' : 'text-away'}`}
      >
        {player.number || '—'}
      </span>
      <PlayerAvatar photo={player.photo} name={player.name} />
      <span className="flex-1 truncate text-sm font-medium leading-none">
        {player.name}
      </span>
      {player.positionLabel && (
        <span className="shrink-0 text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {formatPosition(player.positionLabel)}
        </span>
      )}
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="h-px flex-1 bg-border/50" />
      <span className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border/50" />
    </div>
  );
}

function TeamColumn({
  lineup,
  teamName,
  side,
}: {
  lineup: TeamLineup;
  teamName: string;
  side: 'home' | 'away';
}) {
  const startingRows = groupByRow(lineup.starting);

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold leading-tight">{teamName}</span>
        {lineup.formation && (
          <span className="font-display text-xs font-bold tabular text-muted-foreground">
            {lineup.formation}
          </span>
        )}
      </div>

      <div className="flex flex-col divide-y divide-border/30">
        {startingRows.map(([, players]) =>
          players.map((p) => <PlayerRow key={p.id} player={p} side={side} />),
        )}
      </div>

      {lineup.bench.length > 0 && (
        <>
          <SectionDivider label="Bench" />
          <div className="flex flex-col divide-y divide-border/30 opacity-70">
            {lineup.bench.map((p) => (
              <PlayerRow key={p.id} player={p} side={side} />
            ))}
          </div>
        </>
      )}

      {lineup.coach && (
        <div className="mt-4 flex items-center gap-2 border-t border-border/40 pt-3">
          <span className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Coach
          </span>
          <span className="text-sm font-medium">{lineup.coach}</span>
        </div>
      )}
    </div>
  );
}

export function LineupCards({ lineups, match }: Props) {
  return (
    <div className="grid grid-cols-2 gap-0">
      <div className="pr-6">
        <TeamColumn
          lineup={lineups.home}
          teamName={match.home.name}
          side="home"
        />
      </div>
      <div className="pl-6 border-l border-border/40">
        <TeamColumn
          lineup={lineups.away}
          teamName={match.away.name}
          side="away"
        />
      </div>
    </div>
  );
}
