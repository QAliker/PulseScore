'use client';

import { cn } from '@/lib/utils';
import type { SocketStatus } from '@/lib/types';
import { useSocket } from '@/hooks/use-socket';

export function LiveConnectionBadge({
  status: statusProp,
}: {
  status?: SocketStatus;
} = {}) {
  // No explicit status passed → open our own stream and reflect its state.
  const { status: liveStatus } = useSocket(statusProp === undefined);
  const status = statusProp ?? liveStatus;

  const label =
    status === 'live'
      ? 'Live'
      : status === 'reconnecting'
        ? 'Reconnecting'
        : status === 'connecting'
          ? 'Connecting'
          : 'Offline';

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
          status === 'connecting' && 'bg-amber-500',
          status === 'reconnecting' && 'bg-amber-500',
          status === 'offline' && 'bg-muted-foreground',
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}
