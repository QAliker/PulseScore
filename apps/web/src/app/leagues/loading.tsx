import {
  PageShell,
  HeaderSkeleton,
  CardGridSkeleton,
} from '@/components/ui/loading-blocks';

export default function Loading() {
  return (
    <PageShell width="max-w-[1180px]" className="gap-10">
      <HeaderSkeleton />
      <CardGridSkeleton count={6} cardClassName="h-44" />
    </PageShell>
  );
}
