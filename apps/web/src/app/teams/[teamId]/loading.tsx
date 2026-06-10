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
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-10 w-72 max-w-full rounded-full" />
      <CardGridSkeleton count={6} cardClassName="h-32" />
    </PageShell>
  );
}
