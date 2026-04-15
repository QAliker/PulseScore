import { cn } from '@/lib/utils';
import type { Match } from '@/lib/types';
import { formatMinute } from '@/lib/format';

export function MatchMinute({ match, compact }: { match: Match; compact?: boolean }) {
  const label = formatMinute(match);
  const live = match.status === 'live';
  const halftime = match.status === 'halftime';
  const finished = match.status === 'finished';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-display font-extrabold tabular leading-none',
        compact ? 'text-[0.8rem]' : 'text-[0.95rem]',
        live && 'text-live',
        halftime && 'text-amber-600 dark:text-amber-400',
        finished && 'text-muted-foreground',
        match.status === 'scheduled' && 'text-muted-foreground',
      )}
    >
      {live && (
        <span
          className="size-1.5 rounded-full bg-live live-dot"
          aria-hidden
        />
      )}
      {label}
    </span>
  );
}
