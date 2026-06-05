import Image from 'next/image';
import type { ApiPlayerDetail } from '@/lib/api-types';

const POSITION_HEX: Record<string, string> = {
  Goalkeeper: '#b45309',
  Defender: '#1d4ed8',
  Midfielder: '#059669',
  Forward: '#dc2626',
};

const POSITION_LABEL_EN: Record<string, string> = {
  Goalkeeper: 'Goalkeeper',
  Defender: 'Defender',
  Midfielder: 'Midfielder',
  Forward: 'Forward',
};

const POSITION_ABBREV: Record<string, string> = {
  Goalkeeper: 'GK',
  Defender: 'DEF',
  Midfielder: 'MIL',
  Forward: 'ATT',
};

type Props = { player: ApiPlayerDetail };

function FdoInfoSections({ player }: Props) {
  const statItems: { v: string; l: string }[] = [];
  if (player.nationality) statItems.push({ v: player.nationality, l: 'Nationality' });
  if (player.contractStart && player.contractUntil) {
    statItems.push({ v: player.contractStart, l: 'Contract start' });
    statItems.push({ v: player.contractUntil, l: 'Contract end' });
  } else if (player.contractUntil) {
    statItems.push({ v: player.contractUntil, l: 'Contract end' });
  }
  if (player.teamVenue) statItems.push({ v: player.teamVenue, l: 'Stadium' });
  if (player.teamFounded) statItems.push({ v: String(player.teamFounded), l: 'Founded' });
  if (player.teamColors) statItems.push({ v: player.teamColors, l: 'Colors' });

  const hasClub = player.teamName || player.teamCrest || player.teamAddress || player.teamWebsite || player.teamArea;
  const hasCompetitions = player.teamCompetitions && player.teamCompetitions.length > 0;

  if (statItems.length === 0 && !hasClub && !hasCompetitions) return null;

  const cols = Math.min(statItems.length, 3);
  const gridClass = cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <>
      {statItems.length > 0 && (
        <div className={`grid ${gridClass} divide-x divide-border/50 border-t border-border/50 bg-card`}>
          {statItems.map(({ v, l }) => (
            <div key={l} className="px-3 py-3 text-center">
              <div className="truncate text-sm font-bold leading-none">{v}</div>
              <div className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[.1em] text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      )}

      {hasClub && (
        <div className="border-t border-border/50 bg-card px-4 py-4 sm:px-6">
          <p className="mb-3 text-[0.62rem] font-bold uppercase tracking-[.15em] text-muted-foreground">Club</p>
          <div className="flex items-start gap-4">
            {player.teamCrest && (
              <Image
                src={player.teamCrest}
                alt={player.teamName ?? 'club'}
                width={48}
                height={48}
                className="size-12 shrink-0 object-contain"
                unoptimized
              />
            )}
            <div className="flex flex-col gap-1 min-w-0">
              {player.teamName && (
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-sm">{player.teamName}</span>
                  {player.teamTla && (
                    <span className="text-[0.65rem] font-semibold text-muted-foreground">{player.teamTla}</span>
                  )}
                </div>
              )}
              {player.teamArea && (
                <span className="text-[0.72rem] text-muted-foreground">
                  {player.teamAreaFlag && (
                    <Image src={player.teamAreaFlag} alt={player.teamArea} width={14} height={10} className="mr-1 inline-block object-contain" unoptimized />
                  )}
                  {player.teamArea}
                </span>
              )}
              {player.teamAddress && (
                <span className="text-[0.72rem] text-muted-foreground truncate">{player.teamAddress}</span>
              )}
              {player.teamWebsite && (
                <a
                  href={player.teamWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.72rem] text-primary hover:underline truncate"
                >
                  {player.teamWebsite.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {hasCompetitions && (
        <div className="border-t border-border/50 bg-card px-4 py-4 sm:px-6">
          <p className="mb-3 text-[0.62rem] font-bold uppercase tracking-[.15em] text-muted-foreground">Current competitions</p>
          <div className="flex flex-wrap gap-2">
            {player.teamCompetitions!.map((c) => (
              <div key={c.code} className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1">
                {c.emblem && (
                  <Image src={c.emblem} alt={c.name} width={16} height={16} className="size-4 object-contain" unoptimized />
                )}
                <span className="text-[0.72rem] font-semibold">{c.name}</span>
                <span className="text-[0.62rem] text-muted-foreground">{c.type === 'LEAGUE' ? 'League' : 'Cup'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function PlayerHeroCard({ player }: Props) {
  const baseColor = player.position ? (POSITION_HEX[player.position] ?? '#4a4a8a') : '#4a4a8a';

  const heroStyle = {
    background: `linear-gradient(135deg, color-mix(in srgb, ${baseColor} 80%, black) 0%, color-mix(in srgb, ${baseColor} 55%, black) 40%, hsl(var(--card-hsl, 240 5% 15%)) 100%)`,
  };

  const glowStyle = {
    background: `radial-gradient(ellipse 65% 90% at 12% 55%, color-mix(in srgb, ${baseColor} 35%, transparent) 0%, transparent 70%)`,
  };

  const isFdo = player.externalId.startsWith('fdo:');

  const chips = isFdo
    ? [
        ...(player.age != null ? [{ v: String(player.age), l: 'Age' }] : []),
        ...(player.number != null ? [{ v: `#${player.number}`, l: 'Number' }] : []),
        ...(player.nationality ? [{ v: player.nationality, l: 'Nationality' }] : []),
      ]
    : [
        { v: String(player.goals), l: 'Goals' },
        { v: String(player.assists), l: 'Assists' },
        { v: String(player.matchesPlayed), l: 'Matches' },
        ...(player.age != null ? [{ v: String(player.age), l: 'Age' }] : []),
        ...(player.number != null ? [{ v: `#${player.number}`, l: 'Number' }] : []),
      ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60">
      {/* Gradient hero */}
      <div className="relative px-6 pb-5 pt-7 sm:px-8" style={heroStyle}>
        <div className="pointer-events-none absolute inset-0" style={glowStyle} />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-b from-transparent to-black/20" />

        {/* Photo + name row */}
        <div className="relative z-10 flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="flex size-[76px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-white/10 shadow-[0_6px_24px_rgba(0,0,0,.45)]">
              {player.image ? (
                <Image
                  src={player.image}
                  alt={player.name}
                  width={76}
                  height={76}
                  className="size-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="font-display text-2xl font-black text-white/70">
                  {player.number != null
                    ? String(player.number)
                    : player.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            {player.position && (
              <span
                className="absolute -bottom-0.5 -right-0.5 rounded-full border border-black/40 px-1.5 py-0.5 text-[0.55rem] font-black leading-none text-white shadow-md"
                style={{ background: baseColor }}
              >
                {POSITION_ABBREV[player.position] ?? player.position.slice(0, 3).toUpperCase()}
              </span>
            )}
          </div>

          <div>
            <h1 className="font-display text-3xl font-black tracking-tight text-white drop-shadow-sm sm:text-4xl">
              {player.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {player.teamName && (
                <span className="text-[0.75rem] font-medium text-white/60">{player.teamName}</span>
              )}
              {player.position && (
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-white/85">
                  {POSITION_LABEL_EN[player.position] ?? player.position}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Chips row */}
        <div className="relative z-10 mt-4 flex flex-wrap gap-2">
          {chips.map(({ v, l }) => (
            <div
              key={l}
              className="min-w-[48px] rounded-[9px] border border-white/10 bg-black/30 px-3 py-1.5 text-center backdrop-blur-sm"
            >
              <div className="font-display text-lg font-black leading-none text-white">{v}</div>
              <div className="mt-0.5 text-[0.55rem] font-bold uppercase tracking-[.09em] text-white/40">
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      {isFdo ? (
        <FdoInfoSections player={player} />
      ) : (
        <div className="grid grid-cols-3 divide-x divide-border/50 border-t border-border/50 bg-card sm:grid-cols-6">
          {[
            { v: String(player.goals), l: 'Goals' },
            { v: String(player.assists), l: 'Assists' },
            { v: String(player.matchesPlayed), l: 'Matches' },
            { v: String(player.yellowCards), l: 'Yellow' },
            { v: String(player.redCards), l: 'Red' },
            { v: player.rating ?? '—', l: 'Rating' },
          ].map(({ v, l }) => (
            <div key={l} className="px-3 py-3.5 text-center">
              <div className="font-display text-xl font-black tabular leading-none">{v}</div>
              <div className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[.1em] text-muted-foreground">
                {l}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
