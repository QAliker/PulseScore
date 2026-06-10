import {
  PageShell,
  BackLinkSkeleton,
  HeaderSkeleton,
  TableSkeleton,
} from '@/components/ui/loading-blocks';

export default function Loading() {
  return (
    <PageShell>
      <BackLinkSkeleton />
      <HeaderSkeleton />
      <TableSkeleton rows={12} />
    </PageShell>
  );
}
