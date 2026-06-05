import Image from 'next/image';
import type { ApiStanding } from '@/lib/api-types';

function groupName(raw: string): string {
  // "GROUP_A" → "Group A"
  return raw.replace('GROUP_', 'Group ');
}

export function GroupStandings({ standings }: { standings: ApiStanding[] }) {
  if (standings.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Group standings will appear once the group stage begins.
      </p>
    );
  }

  const groups = new Map<string, ApiStanding[]>();
  for (const s of standings) {
    const key = s.group ?? 'Group';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  const sorted = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sorted.map(([key, rows]) => (
        <div key={key} className="rounded-xl border border-border/60 bg-card p-3">
          <h3 className="mb-2 px-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {groupName(key)}
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[0.62rem] uppercase tracking-wide text-muted-foreground">
                <th className="py-1 pl-1 text-left font-semibold">Team</th>
                <th className="px-1 text-center font-semibold">P</th>
                <th className="px-1 text-center font-semibold">GD</th>
                <th className="px-1 text-center font-semibold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .sort((a, b) => a.position - b.position)
                .map((r) => (
                  <tr key={r.teamId} className="border-t border-border/40">
                    <td className="flex items-center gap-2 py-1.5 pl-1">
                      <span className="w-4 text-center text-xs text-muted-foreground">
                        {r.position}
                      </span>
                      {r.teamBadge && (
                        <Image
                          src={r.teamBadge}
                          alt={r.teamName}
                          width={18}
                          height={18}
                          className="h-[18px] w-[18px] object-contain"
                          unoptimized
                        />
                      )}
                      <span className="truncate font-medium">{r.teamName}</span>
                    </td>
                    <td className="px-1 text-center tabular-nums text-muted-foreground">
                      {r.played}
                    </td>
                    <td className="px-1 text-center tabular-nums text-muted-foreground">
                      {r.goalsFor - r.goalsAgainst}
                    </td>
                    <td className="px-1 text-center font-bold tabular-nums">
                      {r.points}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
