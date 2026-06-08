import Link from 'next/link';
import type { ApiMatch, ApiStanding } from '@/lib/api-types';
import type { League } from '@/lib/leagues';
import { apiFetch } from '@/lib/api';
import { apiMatchesToMatches } from '@/lib/api-match-map';
import { LEAGUES } from '@/lib/leagues';
import { LiveFeed } from '@/components/feed/live-feed';
import { MatchHistory } from '@/components/matches/match-history';
import { StandingMini } from '@/components/standings/standing-mini';
import { LeagueLogo } from '@/components/feed/league-logo';
import { NewsWidget } from '@/components/news/news-widget';

export const dynamic = 'force-dynamic';

/** Loud editorial header for primary (main-column) sections. */
function MainHeading({
  children,
  href,
  cta = 'See all',
}: {
  children: React.ReactNode;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b-2 border-border pb-2">
      <h2 className="font-display text-2xl font-extrabold tracking-tight">{children}</h2>
      {href && (
        <Link
          href={href}
          className="shrink-0 text-[0.78rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {cta} →
        </Link>
      )}
    </div>
  );
}

/** Quiet label for rail (secondary) sections. */
function RailHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </h2>
  );
}

function LeagueLabel({ league }: { league: League }) {
  return (
    <h3 className="flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      <LeagueLogo league={league} size={32} className="size-8" />
      {league.name}
    </h3>
  );
}

function LeagueCard({ league }: { league: League }) {
  return (
    <Link
      href={`/leagues/${league.slug}`}
      className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <LeagueLogo league={league} size={40} className="size-10" />
      <div className="flex flex-col">
        <span className="font-display text-base font-extrabold tracking-tight group-hover:text-foreground">
          {league.name}
        </span>
        <span className="text-xs text-muted-foreground">{league.country} · {league.season}</span>
      </div>
      <span className="ml-auto text-muted-foreground/50 transition-transform group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  );
}

export default async function HomePage() {
  const [livescoreResult, ...rest] = await Promise.allSettled([
    apiFetch<ApiMatch[]>('/livescore', { next: { revalidate: 0 } }),
    ...LEAGUES.map((l) => apiFetch<ApiMatch[]>(`/leagues/${l.apiFootballId}/fixtures`)),
    ...LEAGUES.map((l) => apiFetch<ApiMatch[]>(`/leagues/${l.apiFootballId}/results`)),
    ...LEAGUES.map((l) => apiFetch<ApiStanding[]>(`/leagues/${l.apiFootballId}/standings`)),
  ]);

  const initial = apiMatchesToMatches(
    livescoreResult.status === 'fulfilled' ? livescoreResult.value : [],
  );

  const fixtureGroups = LEAGUES.map((league, i) => ({
    league,
    matches: rest[i].status === 'fulfilled' ? (rest[i].value as ApiMatch[]).slice(0, 5) : [],
    logo: rest[i].status === 'fulfilled' ? ((rest[i].value as ApiMatch[])[0]?.league?.logo ?? null) : null,
  }));

  const resultGroups = LEAGUES.map((league, i) => {
    const r = rest[LEAGUES.length + i];
    const matches = r.status === 'fulfilled' ? (r.value as ApiMatch[]).slice(0, 5) : [];
    return {
      league,
      matches,
      logo: matches[0]?.league?.logo ?? null,
    };
  });

  const standingGroups = LEAGUES.map((league, i) => {
    const r = rest[LEAGUES.length * 2 + i];
    return {
      league,
      standings: r.status === 'fulfilled' ? (r.value as ApiStanding[]) : [],
    };
  });

  const hasFixtures = fixtureGroups.some((g) => g.matches.length > 0);
  const hasResults = resultGroups.some((g) => g.matches.length > 0);
  const hasStandings = standingGroups.some((g) => g.standings.length > 0);

  return (
    <div className="mx-auto max-w-295 px-4 py-6 lg:px-8 lg:py-8">
      {/* Hero — live feed pulls rank */}
      <LiveFeed initial={initial} />

      {/* Primary matches column + secondary news/table rail */}
      <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-12 lg:grid-cols-[minmax(0,1fr)_20.5rem]">
        <main className="flex min-w-0 flex-col gap-12">
          {/* Upcoming fixtures */}
          <section className="flex flex-col gap-5">
            <MainHeading href="/fixtures">Fixtures</MainHeading>

            {hasFixtures ? (
              <div className="flex flex-col gap-7">
                {fixtureGroups.map(({ league, matches }) =>
                  matches.length ? (
                    <div key={league.slug} className="flex flex-col gap-2">
                      <LeagueLabel league={league} />
                      <div className="rounded-xl border border-border/60 bg-card px-4 sm:px-6">
                        <MatchHistory matches={matches} />
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  No fixtures scheduled yet. Browse by league:
                </p>
                <div className="flex flex-col gap-2">
                  {fixtureGroups.map(({ league }) => (
                    <LeagueCard key={league.slug} league={league} />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Recent results */}
          {hasResults && (
            <section className="flex flex-col gap-5">
              <MainHeading href="/results">Results</MainHeading>
              <div className="flex flex-col gap-7">
                {resultGroups.map(({ league, matches }) =>
                  matches.length ? (
                    <div key={league.slug} className="flex flex-col gap-2">
                      <LeagueLabel league={league} />
                      <div className="rounded-xl border border-border/60 bg-card px-4 sm:px-6">
                        <MatchHistory matches={matches} />
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            </section>
          )}
        </main>

        {/* Rail — newspaper gutter, sticks beside the scrolling column */}
        <aside className="flex flex-col gap-9 lg:sticky lg:top-[4.5rem] lg:self-start lg:border-l lg:border-border lg:pl-8">
          <NewsWidget />

          {hasStandings && (
            <section className="flex flex-col gap-5">
              <RailHeading>Table</RailHeading>
              <div className="flex flex-col gap-6">
                {standingGroups.map(({ league, standings }) =>
                  standings.length > 0 ? (
                    <div key={league.slug} className="flex flex-col gap-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          <LeagueLogo league={league} size={16} className="size-4" />
                          {league.name}
                        </h3>
                        <Link
                          href={`/leagues/${league.slug}?tab=standings`}
                          className="shrink-0 text-[0.72rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Full table →
                        </Link>
                      </div>
                      <StandingMini standings={standings} />
                    </div>
                  ) : null,
                )}
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* No data yet — surface the league directory */}
      {!hasFixtures && !hasStandings && (
        <section className="mt-12 flex flex-col gap-3">
          <RailHeading>Leagues</RailHeading>
          <div className="grid gap-2 sm:grid-cols-2">
            {LEAGUES.map((league) => (
              <LeagueCard key={league.slug} league={league} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
