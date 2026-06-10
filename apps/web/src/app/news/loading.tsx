import {
  PageShell,
  HeaderSkeleton,
  CardGridSkeleton,
} from '@/components/ui/loading-blocks';

export default function Loading() {
  return (
    <PageShell width="max-w-[1100px]" className="gap-7">
      <HeaderSkeleton />
      <CardGridSkeleton count={9} cardClassName="h-64" />
    </PageShell>
  );
}
