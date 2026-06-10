import { PageShell, HeaderSkeleton, RowsSkeleton } from '@/components/ui/loading-blocks';

export default function Loading() {
  return (
    <PageShell width="max-w-295">
      <HeaderSkeleton />
      <RowsSkeleton count={8} />
    </PageShell>
  );
}
