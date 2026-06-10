import {
  PageShell,
  BackLinkSkeleton,
  HeaderSkeleton,
  TableSkeleton,
} from '@/components/ui/loading-blocks';

export default function Loading() {
  return (
    <PageShell width="max-w-225">
      <BackLinkSkeleton />
      <HeaderSkeleton />
      <TableSkeleton rows={20} />
    </PageShell>
  );
}
