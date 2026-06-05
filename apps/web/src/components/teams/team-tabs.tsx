'use client';

import { useState } from 'react';
import { Clock, Gauge, Trophy, CalendarCheck } from 'lucide-react';
import type { ApiPlayer, ApiMatch, ApiCoach, ApiVenue, ApiInjury, ApiSeason } from '@/lib/api-types';
import { PlayerCard } from './player-card';
import { MatchHistory } from '@/components/matches/match-history';
import { CoachCard } from './coach-card';
import { VenueCard } from './venue-card';

type Tab = 'squad' | 'matches' | 'coach';

type Props = {
  players: ApiPlayer[];
  results: ApiMatch[];
  fixtures: ApiMatch[];
  coaches: ApiCoach[];
  venue: ApiVenue | null;
  injuries: ApiInjury[];
  season: ApiSeason | null;
  teamId: string;
  squadUnavailable?: boolean;
  squadRateLimited?: boolean;
  matchesUnavailable?: boolean;
  coachUnavailable?: boolean;
};

const POSITION_ORDER = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
const POSITION_LABEL: Record<string, string> = {
  Goalkeeper: 'Goalkeepers',
  Defender: 'Defenders',
  Midfielder: 'Midfielders',
  Forward: 'Forwards',
};

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[0.65rem] font-bold uppercase tracking-[.16em] text-muted-foreground">
      {children}
    </h3>
  );
}

function UnavailableCard() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-6 py-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted/50">
        <Clock className="size-5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">Temporarily unavailable</p>
        <p className="text-xs text-muted-foreground">
          This information will be available shortly.
        </p>
      </div>
    </div>
  );
}

function RateLimitCard() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-6 py-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/15">
        <Gauge className="size-5 text-amber-500" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">Rate limit reached</p>
        <p className="text-xs text-muted-foreground">
          The API allows 10 requests per minute. Wait a few seconds, then reload the page.
        </p>
      </div>
    </div>
  );
}

function SeasonOverCard({ season }: { season: ApiSeason }) {
  const endLabel = season.endDate
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(season.endDate),
      )
    : null;
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-[oklch(0.56_0.16_145)]/25 bg-[oklch(0.56_0.16_145)]/[0.06] px-6 py-10 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-[oklch(0.56_0.16_145)]/15">
        <CalendarCheck className="size-5 text-[oklch(0.46_0.14_145)] dark:text-[oklch(0.7_0.15_145)]" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-display text-base font-extrabold tracking-tight">Season over</p>
        <p className="text-xs text-muted-foreground">
          {endLabel ? `The season ended on ${endLabel}.` : 'The season is over.'}
          {' '}Matches resume next season.
        </p>
      </div>
      {season.winnerName && (
        <div className="mt-1 flex items-center gap-1.5 rounded-full bg-amber-500/12 px-3 py-1 text-[0.72rem] font-semibold text-amber-600 dark:text-amber-400">
          <Trophy className="size-3.5" />
          Champion: {season.winnerName}
        </div>
      )}
    </div>
  );
}

export function TeamTabs({
  players,
  results,
  fixtures,
  coaches,
  venue,
  injuries,
  season,
  teamId,
  squadUnavailable = false,
  squadRateLimited = false,
  matchesUnavailable = false,
  coachUnavailable = false,
}: Props) {
  const [active, setActive] = useState<Tab>('squad');

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'squad', label: 'Squad', count: players.length || undefined },
    { id: 'matches', label: 'Matches', count: results.length + fixtures.length || undefined },
    { id: 'coach', label: 'Coach & Stadium' },
  ];

  const grouped = POSITION_ORDER.reduce(
    (acc, pos) => {
      const group = players.filter((p) => p.position === pos);
      if (group.length > 0) acc.push({ pos, players: group });
      return acc;
    },
    [] as { pos: string; players: ApiPlayer[] }[],
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-border/50 bg-muted/30 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[0.73rem] font-semibold transition-colors sm:px-3 ${
              active === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">
              {tab.label === 'Coach & Stadium' ? 'Coach' : tab.label}
            </span>
            {tab.count != null && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[0.58rem] font-bold leading-none ${
                  active === tab.id
                    ? 'bg-primary/15 text-primary'
                    : 'bg-border/60 text-muted-foreground'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Squad */}
      {active === 'squad' && (
        <div className="flex flex-col gap-5">
          {squadRateLimited ? (
            <RateLimitCard />
          ) : squadUnavailable ? (
            <UnavailableCard />
          ) : (
            <>
              {injuries.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[.12em] text-amber-600/70">
                    Injured ({injuries.length})
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {injuries.map((inj, i) => (
                      <li key={i} className="flex items-center justify-between text-[0.78rem]">
                        <span className="font-medium">{inj.playerName}</span>
                        <span className="text-muted-foreground">{inj.type}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {grouped.map(({ pos, players: group }) => (
                <div key={pos} className="flex flex-col gap-2">
                  <GroupHeading>{POSITION_LABEL[pos] ?? pos}</GroupHeading>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {group.map((p) => (
                      <PlayerCard key={p.externalId} player={p} />
                    ))}
                  </div>
                </div>
              ))}

              {players.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No players available.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Matches */}
      {active === 'matches' && (
        <div className="flex flex-col gap-5">
          {matchesUnavailable ? (
            <UnavailableCard />
          ) : (
            <>
              {results.length > 0 && (
                <div className="flex flex-col gap-2">
                  <GroupHeading>Results</GroupHeading>
                  <div className="rounded-xl border border-border/60 bg-card px-4 sm:px-6">
                    <MatchHistory matches={results} teamId={teamId} />
                  </div>
                </div>
              )}

              {fixtures.length > 0 && (
                <div className="flex flex-col gap-2">
                  <GroupHeading>Upcoming matches</GroupHeading>
                  <div className="rounded-xl border border-border/60 bg-card px-4 sm:px-6">
                    <MatchHistory
                      matches={fixtures}
                      teamId={teamId}
                      emptyMessage="No upcoming matches."
                    />
                  </div>
                </div>
              )}

              {fixtures.length === 0 && results.length > 0 && season?.finished && (
                <SeasonOverCard season={season} />
              )}

              {results.length === 0 && fixtures.length === 0 &&
                (season?.finished ? (
                  <SeasonOverCard season={season} />
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No matches available.
                  </p>
                ))}
            </>
          )}
        </div>
      )}

      {/* Coach & Stadium */}
      {active === 'coach' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {coachUnavailable ? (
            <UnavailableCard />
          ) : (
            <>
              {coaches.length > 0 && (
                <div className="flex flex-col gap-2">
                  <GroupHeading>Manager</GroupHeading>
                  <div className="rounded-xl border border-border/60 bg-card">
                    <CoachCard coaches={coaches} />
                  </div>
                </div>
              )}

              {venue && (
                <div className="flex flex-col gap-2">
                  <GroupHeading>Stadium</GroupHeading>
                  <VenueCard venue={venue} />
                </div>
              )}

              {coaches.length === 0 && !venue && (
                <p className="col-span-2 py-8 text-center text-sm text-muted-foreground">
                  No information available.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
