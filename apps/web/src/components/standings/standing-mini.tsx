import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { ApiStanding } from '@/lib/api-types';

/**
 * Condensed league table for the home rail: rank, crest, club, points.
 * Promotion/relegation is signalled by the rank colour, not a side stripe.
 */
export function StandingMini({
  standings,
  count = 5,
}: {
  standings: ApiStanding[];
  count?: number;
}) {
  const rows = standings.slice(0, count);
  if (!rows.length) return null;

  return (
    <ol className="flex flex-col">
      {rows.map((row, i) => {
        const zone = row.promotion?.toLowerCase() ?? '';
        const isPromotion = zone.includes('promotion') || zone.includes('champions');
        const isRelegation = zone.includes('relegation');
        return (
          <li key={row.teamId}>
            <Link
              href={`/teams/${row.teamId}`}
              className={cn(
                'grid grid-cols-[1.1rem_1.4rem_1fr_auto] items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-accent/40',
                i > 0 && 'border-t border-border/70',
              )}
            >
              <span
                className={cn(
                  'text-center text-[0.72rem] font-semibold tabular',
                  isPromotion && 'text-[oklch(0.56_0.16_145)]',
                  isRelegation && 'text-red-500',
                  !isPromotion && !isRelegation && 'text-muted-foreground/60',
                )}
              >
                {row.position}
              </span>
              {row.teamBadge ? (
                <Image
                  src={row.teamBadge}
                  alt=""
                  width={32}
                  height={32}
                  loading="lazy"
                  className="size-[1.4rem] object-contain"
                />
              ) : (
                <div className="size-[1.4rem] rounded-full bg-muted" />
              )}
              <span className="truncate text-[0.82rem] font-medium">{row.teamName}</span>
              <span className="tabular text-[0.82rem] font-bold">{row.points}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
