import type { ApiMatch } from '@/lib/api-types';
import { apiFetch } from '@/lib/api';
import { apiMatchesToMatches } from '@/lib/api-match-map';
import { LiveFeed } from '@/components/feed/live-feed';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let initial = apiMatchesToMatches([]);
  try {
    const data = await apiFetch<ApiMatch[]>('/livescore', { next: { revalidate: 0 } });
    initial = apiMatchesToMatches(data);
  } catch {
    // API offline — LiveFeed shows empty state and reconnects via SSE
  }

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <LiveFeed initial={initial} />
    </div>
  );
}
