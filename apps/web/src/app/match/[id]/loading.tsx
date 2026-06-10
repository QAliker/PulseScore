import { Skeleton } from '@/components/ui/skeleton';
import { PageShell, BackLinkSkeleton } from '@/components/ui/loading-blocks';

export default function Loading() {
  return (
    <PageShell width="max-w-225">
      <BackLinkSkeleton />
      {/* Scoreboard */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/40 p-6">
        <div className="flex flex-1 flex-col items-center gap-3">
          <Skeleton className="size-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-12 w-24 rounded-lg" />
        <div className="flex flex-1 flex-col items-center gap-3">
          <Skeleton className="size-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      {/* Section nav */}
      <Skeleton className="h-10 w-full rounded-full" />
      {/* Body */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </PageShell>
  );
}
