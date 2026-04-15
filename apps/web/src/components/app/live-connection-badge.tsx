'use client';

import { cn } from '@/lib/utils';

// Placeholder for Commit 1 — will read real state from useSocket in Commit 2.
// Hardcoded to "live" so the visual exists during shell development.
type Status = 'live' | 'reconnecting' | 'offline';

export function LiveConnectionBadge({ status = 'live' }: { status?: Status } = {}) {
  const label =
    status === 'live' ? 'Live' : status === 'reconnecting' ? 'Reconnecting' : 'Offline';

  return (
    <span
      className={cn(
        'hidden items-center gap-2 rounded-full border border-border/60 bg-secondary/60 px-2.5 py-1 text-xs font-medium sm:inline-flex',
        status === 'offline' && 'text-muted-foreground',
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          status === 'live' && 'bg-live live-dot',
          status === 'reconnecting' && 'bg-amber-500',
          status === 'offline' && 'bg-muted-foreground',
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}
