import { Skeleton } from '@/components/ui/skeleton';
import {
  PageShell,
  BackLinkSkeleton,
  CardGridSkeleton,
} from '@/components/ui/loading-blocks';

export default function Loading() {
  return (
    <PageShell>
      <BackLinkSkeleton />
      <div className="flex items-center gap-4">
        <Skeleton className="size-24 rounded-full" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <CardGridSkeleton count={6} cardClassName="h-28" />
    </PageShell>
  );
}
