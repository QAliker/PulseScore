import { Skeleton } from '@/components/ui/skeleton';
import {
  PageShell,
  BackLinkSkeleton,
  RowsSkeleton,
} from '@/components/ui/loading-blocks';

export default function Loading() {
  return (
    <PageShell>
      <BackLinkSkeleton />
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/40 p-6">
        <div className="flex flex-1 flex-col items-center gap-3">
          <Skeleton className="size-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-16 rounded-lg" />
        <div className="flex flex-1 flex-col items-center gap-3">
          <Skeleton className="size-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <RowsSkeleton count={6} />
    </PageShell>
  );
}
