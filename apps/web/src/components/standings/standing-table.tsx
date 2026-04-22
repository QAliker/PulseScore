import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ApiStanding } from '@/lib/api-types';

type Props = { standings: ApiStanding[] };

export function StandingTable({ standings }: Props) {
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
            <th className="py-2 pr-3 text-left w-8">#</th>
            <th className="py-2 text-left">Team</th>
            <th className="py-2 px-2 text-center">P</th>
            <th className="py-2 px-2 text-center">W</th>
            <th className="py-2 px-2 text-center">D</th>
            <th className="py-2 px-2 text-center">L</th>
            <th className="py-2 px-2 text-center">GF</th>
            <th className="py-2 px-2 text-center">GA</th>
            <th className="py-2 px-2 text-center">GD</th>
            <th className="py-2 pl-2 text-center font-bold">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {standings.map((row) => (
            <tr
              key={row.teamId}
              className={cn(
                'group transition-colors hover:bg-accent/40',
                row.promotion?.toLowerCase().includes('promotion') && 'bg-emerald-500/5',
                row.promotion?.toLowerCase().includes('relegation') && 'bg-red-500/5',
              )}
            >
              <td className="py-2.5 pr-3 tabular text-muted-foreground">{row.position}</td>
              <td className="py-2.5">
                <Link
                  href={`/teams/${row.teamId}`}
                  className="flex items-center gap-2 font-medium hover:underline"
                >
                  {row.teamBadge && (
                    <img
                      src={row.teamBadge}
                      alt=""
                      className="size-5 object-contain"
                      loading="lazy"
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
              <td className="py-2.5 pl-2 text-center tabular font-bold">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
