import {
  PageShell,
  BackLinkSkeleton,
  HeaderSkeleton,
  RowsSkeleton,
} from '@/components/ui/loading-blocks';

export default function Loading() {
  return (
    <PageShell>
      <BackLinkSkeleton />
      <HeaderSkeleton />
      <RowsSkeleton count={10} />
    </PageShell>
  );
}
