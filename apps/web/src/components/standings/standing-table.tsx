import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ApiStanding } from '@/lib/api-types';
import Image from 'next/image';

type Props = { standings: ApiStanding[] };

const FORM_STYLES: Record<string, string> = {
  W: 'bg-[oklch(0.56_0.16_145)] text-[oklch(0.99_0.01_145)]',
  L: 'bg-red-500/85 text-white',
  D: 'bg-muted-foreground/25 text-muted-foreground',
};

function FormStrip({ form }: { form: string | null }) {
  if (!form) return <span className="text-muted-foreground/40">—</span>;
  const results = form
    .replace(/[^WDL]/g, '')
    .split('')
    .slice(-5);
  if (results.length === 0)
    return <span className="text-muted-foreground/40">—</span>;
  return (
    <div className="flex items-center justify-center gap-1">
      {results.map((r, i) => (
        <span
          key={i}
          title={r === 'W' ? 'Win' : r === 'L' ? 'Loss' : 'Draw'}
          className={cn(
            'flex size-[1.15rem] items-center justify-center rounded-[5px] text-[0.6rem] font-bold leading-none',
            FORM_STYLES[r] ?? 'bg-muted text-muted-foreground',
          )}
        >
          {r}
        </span>
      ))}
    </div>
  );
}

export function StandingTable({ standings }: Props) {
  const hasForm = standings.some((s) => s.form);
  if (!standings.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No standings available.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <th className="py-2 pr-3 text-left w-8 pl-3">#</th>
            <th className="py-2 text-left">Team</th>
            <th className="py-2 px-2 text-center">P</th>
            <th className="py-2 px-2 text-center">W</th>
            <th className="py-2 px-2 text-center">D</th>
            <th className="py-2 px-2 text-center">L</th>
            <th className="py-2 px-2 text-center">GF</th>
            <th className="py-2 px-2 text-center">GA</th>
            <th className="py-2 px-2 text-center">GD</th>
            <th className="py-2 px-2 text-center font-bold">Pts</th>
            {hasForm && (
              <th className="hidden py-2 pl-3 pr-3 text-center sm:table-cell">Form</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {standings.map((row, index) => {
            const isPromotion = row.promotion?.toLowerCase().includes('promotion');
            const isRelegation = row.promotion?.toLowerCase().includes('relegation');
            return (
            <tr
              key={row.teamId}
              className={cn(
                'group transition-colors hover:bg-accent/40',
                isPromotion && 'bg-emerald-500/10 dark:bg-emerald-500/20',
                isRelegation && 'bg-red-500/10 dark:bg-red-500/20',
              )}
            >
              <td className={cn(
                'py-2.5 pr-3 pl-2 tabular text-muted-foreground border-l-[3px]',
                isPromotion && 'border-emerald-500',
                isRelegation && 'border-red-500',
                !isPromotion && !isRelegation && 'border-transparent',
              )}>{row.position}</td>
              <td className="py-2.5">
                <Link
                  href={`/teams/${row.teamId}`}
                  className="flex items-center gap-2 font-medium hover:underline"
                >
                  {row.teamBadge && (
                    <Image
                      src={row.teamBadge}
                      alt=""
                      className="size-5 object-contain"
                      loading={index === 0 ? 'eager' : 'lazy'}
                      width={40} height={40}
                    />
                  )}
                  {row.teamName}
                </Link>
              </td>
              <td className="py-2.5 px-2 text-center tabular text-muted-foreground">{row.played}</td>
              <td className="py-2.5 px-2 text-center tabular">{row.won}</td>
              <td className="py-2.5 px-2 text-center tabular text-muted-foreground">{row.drawn}</td>
              <td className="py-2.5 px-2 text-center tabular text-muted-foreground">{row.lost}</td>
              <td className="py-2.5 px-2 text-center tabular text-muted-foreground">{row.goalsFor}</td>
              <td className="py-2.5 px-2 text-center tabular text-muted-foreground">{row.goalsAgainst}</td>
              <td className="py-2.5 px-2 text-center tabular text-muted-foreground">
                {row.goalsFor - row.goalsAgainst > 0 ? '+' : ''}
                {row.goalsFor - row.goalsAgainst}
              </td>
              <td className="py-2.5 px-2 text-center tabular font-bold">{row.points}</td>
              {hasForm && (
                <td className="hidden py-2.5 pl-3 pr-3 sm:table-cell">
                  <FormStrip form={row.form} />
                </td>
              )}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
