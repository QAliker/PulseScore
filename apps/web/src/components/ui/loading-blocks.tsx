import { Skeleton } from '@/components/ui/skeleton';

/** Outer page wrapper that mirrors a route's content width + padding. */
export function PageShell({
  width = 'max-w-[900px]',
  className = '',
  children,
}: {
  width?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mx-auto flex ${width} flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8 ${className}`}
      aria-busy
      aria-live="polite"
    >
      {children}
    </div>
  );
}

/** Small "← Back" pill placeholder. */
export function BackLinkSkeleton() {
  return <Skeleton className="h-7 w-24 rounded-md" />;
}

/** Page title + subtitle block. */
export function HeaderSkeleton({ withSubtitle = true }: { withSubtitle?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>
      {withSubtitle && <Skeleton className="h-4 w-72 max-w-full" />}
    </div>
  );
}

/** Stack of match/list rows. */
export function RowsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[68px_1fr_auto_1fr] items-center gap-3 border-b border-border/40 px-3 py-4"
        >
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-40 justify-self-end" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </div>
  );
}

/** Responsive grid of cards (leagues, teams, etc.). */
export function CardGridSkeleton({
  count = 6,
  cardClassName = 'h-40',
}: {
  count?: number;
  cardClassName?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`w-full rounded-2xl ${cardClassName}`} />
      ))}
    </div>
  );
}

/** Standings / generic table placeholder. */
export function TableSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/40 p-4">
      <Skeleton className="h-9 w-full rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-lg" />
      ))}
    </div>
  );
}
