import Image from 'next/image';
import type { ApiTeam, ApiTeamStanding, ApiMatch } from '@/lib/api-types';

type FormResult = 'W' | 'D' | 'L';

function deriveForm(results: ApiMatch[], teamId: string): FormResult[] {
  return results
    .slice(0, 5)
    .flatMap((m) => {
      if (m.homeScore == null || m.awayScore == null) return [];
      const isHome = m.homeTeam.externalId === teamId;
      const scored = isHome ? m.homeScore : m.awayScore;
      const conceded = isHome ? m.awayScore : m.homeScore;
      return scored > conceded ? ['W'] : scored < conceded ? ['L'] : ['D'];
    }) as FormResult[];
}

type Props = {
  team: ApiTeam;
  standing: ApiTeamStanding | null;
  results: ApiMatch[];
  teamColor: string | null;
};

export function TeamHeroCard({ team, standing, results, teamColor }: Props) {
  const form = deriveForm(results, team.externalId);

  const goalsPerMatch =
    standing && standing.played > 0
      ? (standing.goalsFor / standing.played).toFixed(1)
      : null;
  const concededPerMatch =
    standing && standing.played > 0
      ? (standing.goalsAgainst / standing.played).toFixed(1)
      : null;
  const goalDiff = standing
    ? standing.goalsFor - standing.goalsAgainst
    : null;

  const baseColor = teamColor ?? '#4a4a8a';
  const heroStyle = {
    background: `linear-gradient(135deg, color-mix(in srgb, ${baseColor} 80%, black) 0%, color-mix(in srgb, ${baseColor} 55%, black) 40%, hsl(var(--card-hsl, 240 5% 15%)) 100%)`,
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60">
      {/* Gradient hero */}
      <div className="relative px-6 pb-5 pt-7 sm:px-8" style={heroStyle}>
        {/* Radial glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 65% 90% at 12% 55%, color-mix(in srgb, ${baseColor} 35%, transparent) 0%, transparent 70%)`,
          }}
        />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-b from-transparent to-black/20" />

        {/* Top row: logo + name */}
        <div className="relative z-10 flex items-center gap-5">
          <div className="flex size-[76px] shrink-0 items-center justify-center rounded-full border-2 border-white/20 bg-white/10 shadow-[0_6px_24px_rgba(0,0,0,.45)]">
            {team.logo ? (
              <Image
                src={team.logo}
                alt={team.name}
                width={56}
                height={56}
                className="size-14 object-contain"
                unoptimized
              />
            ) : (
              <span className="font-display text-2xl font-black text-white/70">
                {team.shortName?.slice(0, 3) ?? team.name.slice(0, 3)}
              </span>
            )}
          </div>

          <div>
            <h1 className="font-display text-3xl font-black tracking-tight text-white drop-shadow-sm sm:text-4xl">
              {team.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {team.country && (
                <span className="text-[0.75rem] font-medium text-white/60">
                  {team.country}
                </span>
              )}
              {standing && (
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-white/85">
                  {standing.leagueName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom row: form + rank chips */}
        <div className="relative z-10 mt-4 flex flex-wrap items-end gap-3">
          {form.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[0.6rem] font-bold uppercase tracking-[.1em] text-white/40">
                Form
              </span>
              <div className="flex gap-1">
                {form.map((r, i) => (
                  <span
                    key={i}
                    className={`inline-flex size-[22px] items-center justify-center rounded-[5px] text-[0.6rem] font-black ${
                      r === 'W'
                        ? 'border border-emerald-400/30 bg-emerald-500/20 text-emerald-400'
                        : r === 'L'
                          ? 'border border-red-400/30 bg-red-500/20 text-red-400'
                          : 'border border-white/15 bg-white/10 text-white/60'
                    }`}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {standing && (
            <div className="flex gap-2">
              {[
                { v: `${standing.position}e`, l: 'Rank' },
                { v: String(standing.points), l: 'Pts' },
                { v: String(standing.won), l: 'Wins' },
                {
                  v: goalDiff != null ? (goalDiff >= 0 ? `+${goalDiff}` : String(goalDiff)) : '—',
                  l: 'Diff.',
                  green: goalDiff != null && goalDiff > 0,
                },
              ].map(({ v, l, green }) => (
                <div
                  key={l}
                  className="min-w-[48px] rounded-[9px] border border-white/10 bg-black/30 px-3 py-1.5 text-center backdrop-blur-sm"
                >
                  <div
                    className={`font-display text-lg font-black leading-none ${green ? 'text-emerald-400' : 'text-white'}`}
                  >
                    {v}
                  </div>
                  <div className="mt-0.5 text-[0.55rem] font-bold uppercase tracking-[.09em] text-white/40">
                    {l}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats strip */}
      {standing && standing.played > 0 && (
        <div className="grid grid-cols-4 divide-x divide-border/50 border-t border-border/50 bg-card">
          {[
            { v: goalsPerMatch ?? '—', l: 'Goals / Match', pct: Math.min(Number(goalsPerMatch) / 4, 1), color: 'from-primary/60 to-primary' },
            { v: concededPerMatch ?? '—', l: 'Conceded / M', pct: Math.min(Number(concededPerMatch) / 3, 1), color: 'from-emerald-600/60 to-emerald-500' },
            { v: String(standing.won), l: 'Wins', pct: standing.won / standing.played, color: 'from-primary/60 to-primary' },
            { v: `${Math.round((standing.won / standing.played) * 100)}%`, l: 'Win Rate', pct: standing.won / standing.played, color: 'from-amber-500/60 to-amber-400' },
          ].map(({ v, l, pct, color }) => (
            <div key={l} className="px-3 py-3.5">
              <div className="font-display text-xl font-black tabular leading-none">{v}</div>
              <div className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[.1em] text-muted-foreground">
                {l}
              </div>
              <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-border/50">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${color}`}
                  style={{ width: `${Math.round(pct * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
