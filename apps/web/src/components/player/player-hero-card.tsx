import Image from 'next/image';
import type { ApiPlayerDetail } from '@/lib/api-types';

const POSITION_HEX: Record<string, string> = {
  Goalkeeper: '#b45309',
  Defender: '#1d4ed8',
  Midfielder: '#059669',
  Forward: '#dc2626',
};

const POSITION_LABEL_FR: Record<string, string> = {
  Goalkeeper: 'Gardien',
  Defender: 'Défenseur',
  Midfielder: 'Milieu',
  Forward: 'Attaquant',
};

const POSITION_ABBREV: Record<string, string> = {
  Goalkeeper: 'GK',
  Defender: 'DEF',
  Midfielder: 'MIL',
  Forward: 'ATT',
};

type Props = { player: ApiPlayerDetail };

export function PlayerHeroCard({ player }: Props) {
  const baseColor = player.position ? (POSITION_HEX[player.position] ?? '#4a4a8a') : '#4a4a8a';

  const heroStyle = {
    background: `linear-gradient(135deg, color-mix(in srgb, ${baseColor} 80%, black) 0%, color-mix(in srgb, ${baseColor} 55%, black) 40%, hsl(var(--card-hsl, 240 5% 15%)) 100%)`,
  };

  const glowStyle = {
    background: `radial-gradient(ellipse 65% 90% at 12% 55%, color-mix(in srgb, ${baseColor} 35%, transparent) 0%, transparent 70%)`,
  };

  const chips = [
    { v: String(player.goals), l: 'Buts' },
    { v: String(player.assists), l: 'Passes D.' },
    { v: String(player.matchesPlayed), l: 'Matchs' },
    ...(player.age != null ? [{ v: String(player.age), l: 'Âge' }] : []),
    ...(player.number != null ? [{ v: `#${player.number}`, l: 'Numéro' }] : []),
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
                  {POSITION_LABEL_FR[player.position] ?? player.position}
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
      <div className="grid grid-cols-3 divide-x divide-border/50 border-t border-border/50 bg-card sm:grid-cols-6">
        {[
          { v: String(player.goals), l: 'Buts' },
          { v: String(player.assists), l: 'Passes D.' },
          { v: String(player.matchesPlayed), l: 'Matchs' },
          { v: String(player.yellowCards), l: 'Jaune' },
          { v: String(player.redCards), l: 'Rouge' },
          { v: player.rating ?? '—', l: 'Note' },
        ].map(({ v, l }) => (
          <div key={l} className="px-3 py-3.5 text-center">
            <div className="font-display text-xl font-black tabular leading-none">{v}</div>
            <div className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[.1em] text-muted-foreground">
              {l}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
