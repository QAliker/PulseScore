import { getInitialFixtures } from '@/lib/mock-data';
import { LiveFeed } from '@/components/feed/live-feed';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const initial = getInitialFixtures();

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <LiveFeed initial={initial} />
    </div>
  );
}
