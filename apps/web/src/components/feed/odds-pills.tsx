import type { Odds } from '@/lib/types';
import { cn } from '@/lib/utils';

export function OddsPills({ odds, className }: { odds: Odds; className?: string }) {
  return (
    <div
      className={cn(
        '@[720px]:flex hidden items-center gap-1 text-[0.72rem] tabular',
        className,
      )}
      aria-label="1X2 odds"
    >
      <OddPill label="1" value={odds.home} />
      <OddPill label="X" value={odds.draw} />
      <OddPill label="2" value={odds.away} />
    </div>
  );
}

function OddPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/50 px-1.5 py-1">
      <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-semibold">{value.toFixed(2)}</span>
    </span>
  );
}
