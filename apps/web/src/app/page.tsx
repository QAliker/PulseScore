import Link from 'next/link';
import type { ApiMatch, ApiStanding } from '@/lib/api-types';
import type { League } from '@/lib/leagues';
import { apiFetch } from '@/lib/api';
import { apiMatchesToMatches } from '@/lib/api-match-map';
import { LEAGUES } from '@/lib/leagues';
import { LiveFeed } from '@/components/feed/live-feed';
import { MatchHistory } from '@/components/matches/match-history';
import { StandingTable } from '@/components/standings/standing-table';
import { LeagueLogo } from '@/components/feed/league-logo';

export const dynamic = 'force-dynamic';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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
    <div className="mx-auto flex max-w-295 flex-col gap-10 px-4 py-6 lg:px-8 lg:py-8">
      <LiveFeed initial={initial} />

      {/* Upcoming fixtures + Recent results: full-width stacked */}
      <div className="flex flex-col gap-10">
        {/* Upcoming fixtures */}
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <SectionHeading>Upcoming</SectionHeading>
            <Link
              href="/fixtures"
              className="text-[0.78rem] font-medium text-muted-foreground hover:text-foreground"
            >
              See all →
            </Link>
          </div>

          {hasFixtures ? (
            <div className="flex flex-col gap-4">
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
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <SectionHeading>Recent Results</SectionHeading>
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
      </div>

      {/* Standings: full-width section, leagues in responsive 2-col grid */}
      {hasStandings ? (
        <section className="flex flex-col gap-4">
          <SectionHeading>Standings</SectionHeading>
          <div className="grid gap-6 md:grid-cols-2">
            {standingGroups.map(({ league, standings }) =>
              standings.length > 0 ? (
                <div key={league.slug} className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between">
                    <h3 className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <LeagueLogo league={league} size={14} className="size-3.5" />
                      {league.name}
                    </h3>
                    <Link
                      href={`/leagues/${league.slug}?tab=standings`}
                      className="text-[0.78rem] font-medium text-muted-foreground hover:text-foreground"
                    >
                      Full table →
                    </Link>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
                    <div className="overflow-x-auto">
                      <StandingTable standings={standings.slice(0, 8)} />
                    </div>
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <SectionHeading>Leagues</SectionHeading>
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
