import Link from 'next/link';
import Image from 'next/image';
import type { ApiMatch } from '@/lib/api-types';
import type { League } from '@/lib/leagues';
import { apiFetch } from '@/lib/api';
import { apiMatchesToMatches } from '@/lib/api-match-map';
import { LEAGUES } from '@/lib/leagues';
import { LiveFeed } from '@/components/feed/live-feed';
import { MatchHistory } from '@/components/matches/match-history';

function LeagueLabel({ league, logo }: { league: League; logo: string | null }) {
  return (
    <h3 className="flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {logo ? (
        <Image src={logo} alt="" width={32} height={32} className="size-8 object-contain" unoptimized />
      ) : (
        <span className="text-2xl leading-none" aria-hidden>{league.flag}</span>
      )}
      {league.name}
    </h3>
  );
}

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [livescoreResult, ...rest] = await Promise.allSettled([
    apiFetch<ApiMatch[]>('/livescore', { next: { revalidate: 0 } }),
    ...LEAGUES.map((l) => apiFetch<ApiMatch[]>(`/leagues/${l.apiFootballId}/fixtures`)),
    ...LEAGUES.map((l) => apiFetch<ApiMatch[]>(`/leagues/${l.apiFootballId}/results`)),
  ]);

  const initial = apiMatchesToMatches(
    livescoreResult.status === 'fulfilled' ? livescoreResult.value : [],
  );

  const fixtureGroups = LEAGUES.map((league, i) => ({
    league,
    matches: rest[i].status === 'fulfilled' ? rest[i].value.slice(0, 5) : [],
  }));

  const resultGroups = LEAGUES.map((league, i) => ({
    league,
    matches:
      rest[LEAGUES.length + i].status === 'fulfilled'
        ? rest[LEAGUES.length + i].value.slice(0, 5)
        : [],
  }));

  const hasFixtures = fixtureGroups.some((g) => g.matches.length > 0);
  const hasResults = resultGroups.some((g) => g.matches.length > 0);

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-10 px-4 py-6 lg:px-8 lg:py-8">
      <LiveFeed initial={initial} />

      {hasFixtures && (
        <section className="flex flex-col gap-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-extrabold tracking-tight">Upcoming</h2>
            <Link
              href="/fixtures"
              className="text-[0.78rem] font-medium text-muted-foreground hover:text-foreground"
            >
              See all →
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            {fixtureGroups.map(({ league, matches }) =>
              matches.length ? (
                <div key={league.slug} className="flex flex-col gap-2">
                  <LeagueLabel league={league} logo={matches[0]?.league?.logo ?? null} />
                  <div className="rounded-xl border border-border/60 bg-card px-4 sm:px-6">
                    <MatchHistory matches={matches} />
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </section>
      )}

      {hasResults && (
        <section className="flex flex-col gap-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-extrabold tracking-tight">Results</h2>
            <Link
              href="/results"
              className="text-[0.78rem] font-medium text-muted-foreground hover:text-foreground"
            >
              See all →
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            {resultGroups.map(({ league, matches }) =>
              matches.length ? (
                <div key={league.slug} className="flex flex-col gap-2">
                  <LeagueLabel league={league} logo={matches[0]?.league?.logo ?? null} />
                  <div className="rounded-xl border border-border/60 bg-card px-4 sm:px-6">
                    <MatchHistory matches={matches} />
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </section>
      )}
    </div>
  );
}
