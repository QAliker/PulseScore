import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { apiFetch } from '@/lib/api';
import { LEAGUES } from '@/lib/leagues';
import type { ApiStanding, ApiMatch } from '@/lib/api-types';
import { StandingTable } from '@/components/standings/standing-table';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Leagues' };

export default async function LeaguesPage() {
  const results = await Promise.allSettled(
    LEAGUES.flatMap((l) => [
      apiFetch<ApiStanding[]>(`/leagues/${l.apiFootballId}/standings`),
      apiFetch<ApiMatch[]>(`/leagues/${l.apiFootballId}/fixtures`),
    ]),
  );

  const leagueData = LEAGUES.map((league, i) => {
    const sr = results[i * 2] as PromiseSettledResult<ApiStanding[]>;
    const fr = results[i * 2 + 1] as PromiseSettledResult<ApiMatch[]>;
    return {
      league,
      standings: sr.status === 'fulfilled' ? sr.value : [],
      logo: fr.status === 'fulfilled' ? (fr.value[0]?.league?.logo ?? null) : null,
    };
  });

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-10 px-4 py-6 lg:px-8 lg:py-8">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Leagues</h1>

      {leagueData.map(({ league, standings, logo }) => (
        <section key={league.slug} className="flex flex-col gap-4">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {logo ? (
                <Image
                  src={logo}
                  alt={league.name}
                  width={48}
                  height={48}
                  className="size-12 object-contain"
                  unoptimized
                />
              ) : (
                <span className="text-4xl leading-none">{league.flag}</span>
              )}
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {league.country} · {league.season}
                </p>
                <h2 className="font-display text-xl font-extrabold tracking-tight">
                  {league.name}
                </h2>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/results?league=${league.apiFootballId}`}
                className="rounded-full border border-border/60 bg-card px-3.5 py-1.5 text-[0.78rem] font-semibold hover:bg-accent/60 transition-colors"
              >
                Results
              </Link>
              <Link
                href={`/fixtures?league=${league.apiFootballId}`}
                className="rounded-full border border-border/60 bg-card px-3.5 py-1.5 text-[0.78rem] font-semibold hover:bg-accent/60 transition-colors"
              >
                Fixtures
              </Link>
            </div>
          </header>

          <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
            {standings.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Standings unavailable — API key required.
              </p>
            ) : (
              <StandingTable standings={standings} />
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
