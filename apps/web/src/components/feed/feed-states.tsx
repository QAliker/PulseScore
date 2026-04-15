import Link from 'next/link';

export function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy aria-live="polite">
      <div className="h-44 animate-pulse rounded-2xl bg-muted/60" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[68px_1fr_auto_1fr] gap-3 border-b border-border/40 px-3 py-4"
        >
          <div className="h-4 w-10 animate-pulse rounded bg-muted/60" />
          <div className="h-4 w-40 animate-pulse rounded bg-muted/60 justify-self-end" />
          <div className="h-6 w-16 animate-pulse rounded bg-muted/60" />
          <div className="h-4 w-40 animate-pulse rounded bg-muted/60" />
        </div>
      ))}
    </div>
  );
}

export function EmptyLeague({ leagueName }: { leagueName: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 bg-card/40 px-6 py-12 text-center">
      <PitchLines />
      <p className="font-display text-lg font-extrabold">No matches today</p>
      <p className="max-w-[40ch] text-sm text-muted-foreground">
        {leagueName} is off today. Check back on the next match day.
      </p>
    </div>
  );
}

export function FeedError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm"
    >
      <div className="flex flex-col">
        <span className="font-semibold text-destructive">Couldn’t refresh scores</span>
        <span className="text-xs text-muted-foreground">
          Showing last known state. Retrying in 3s…
        </span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-destructive/40 bg-background px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
        >
          Retry now
        </button>
      )}
    </div>
  );
}

export function NoFavoritesHint() {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 px-4 py-3 text-sm text-muted-foreground">
      Tap the <span className="font-semibold text-foreground">★</span> on any match to pin it to the top.{' '}
      <Link href="/" className="font-semibold text-primary underline-offset-4 hover:underline">
        Browse today
      </Link>
    </div>
  );
}

function PitchLines() {
  return (
    <svg
      viewBox="0 0 120 50"
      className="h-12 w-28 text-muted-foreground/50"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="1" y="1" width="118" height="48" rx="2" />
      <line x1="60" y1="1" x2="60" y2="49" />
      <circle cx="60" cy="25" r="8" />
      <rect x="1" y="14" width="12" height="22" />
      <rect x="107" y="14" width="12" height="22" />
    </svg>
  );
}
