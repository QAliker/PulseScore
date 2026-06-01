'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import type { ApiPlayer, ApiMatch, ApiCoach, ApiVenue, ApiInjury, ApiTransfers } from '@/lib/api-types';
import { PlayerCard } from './player-card';
import { MatchHistory } from '@/components/matches/match-history';
import { CoachCard } from './coach-card';
import { VenueCard } from './venue-card';
import { TransfersTimeline } from '@/components/player/transfers-timeline';

type Tab = 'squad' | 'matches' | 'coach' | 'transfers';

type Props = {
  players: ApiPlayer[];
  results: ApiMatch[];
  fixtures: ApiMatch[];
  coaches: ApiCoach[];
  venue: ApiVenue | null;
  injuries: ApiInjury[];
  teamTransfers: ApiTransfers[];
  teamId: string;
  squadUnavailable?: boolean;
  matchesUnavailable?: boolean;
  coachUnavailable?: boolean;
  transfersUnavailable?: boolean;
};

const POSITION_ORDER = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
const POSITION_LABEL: Record<string, string> = {
  Goalkeeper: 'Gardiens',
  Defender: 'Défenseurs',
  Midfielder: 'Milieux',
  Forward: 'Attaquants',
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
        <p className="text-sm font-medium text-foreground">Données temporairement indisponibles</p>
        <p className="text-xs text-muted-foreground">
          Ces informations seront disponibles dans quelques instants.
        </p>
      </div>
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
  teamTransfers,
  teamId,
  squadUnavailable = false,
  matchesUnavailable = false,
  coachUnavailable = false,
  transfersUnavailable = false,
}: Props) {
  const [active, setActive] = useState<Tab>('squad');

  const totalTransfers = teamTransfers.reduce((s, t) => s + t.transfers.length, 0);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'squad', label: 'Effectif', count: players.length || undefined },
    { id: 'matches', label: 'Matchs', count: results.length + fixtures.length || undefined },
    { id: 'coach', label: 'Coach & Stade' },
    { id: 'transfers', label: 'Transferts', count: totalTransfers || undefined },
  ];

  const grouped = POSITION_ORDER.reduce(
    (acc, pos) => {
      const group = players.filter((p) => p.position === pos);
      if (group.length > 0) acc.push({ pos, players: group });
      return acc;
    },
    [] as { pos: string; players: ApiPlayer[] }[],
  );
  const others = players.filter((p) => !p.position || !POSITION_ORDER.includes(p.position));

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
              {tab.label === 'Effectif' ? 'Effectif' : tab.label === 'Matchs' ? 'Matchs' : tab.label === 'Coach & Stade' ? 'Coach' : 'Transferts'}
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

      {/* Effectif */}
      {active === 'squad' && (
        <div className="flex flex-col gap-5">
          {squadUnavailable ? (
            <UnavailableCard />
          ) : (
            <>
              {injuries.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[.12em] text-amber-600/70">
                    Blessés ({injuries.length})
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

              {others.length > 0 && (
                <div className="flex flex-col gap-2">
                  <GroupHeading>Autres</GroupHeading>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {others.map((p) => (
                      <PlayerCard key={p.externalId} player={p} />
                    ))}
                  </div>
                </div>
              )}

              {players.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Aucun joueur disponible.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Matchs */}
      {active === 'matches' && (
        <div className="flex flex-col gap-5">
          {matchesUnavailable ? (
            <UnavailableCard />
          ) : (
            <>
              {results.length > 0 && (
                <div className="flex flex-col gap-2">
                  <GroupHeading>Résultats</GroupHeading>
                  <div className="rounded-xl border border-border/60 bg-card px-4 sm:px-6">
                    <MatchHistory matches={results} teamId={teamId} />
                  </div>
                </div>
              )}

              {fixtures.length > 0 && (
                <div className="flex flex-col gap-2">
                  <GroupHeading>Prochains matchs</GroupHeading>
                  <div className="rounded-xl border border-border/60 bg-card px-4 sm:px-6">
                    <MatchHistory
                      matches={fixtures}
                      teamId={teamId}
                      emptyMessage="Aucune rencontre à venir."
                    />
                  </div>
                </div>
              )}

              {results.length === 0 && fixtures.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Aucun match disponible.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Coach & Stade */}
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
                  <GroupHeading>Stade</GroupHeading>
                  <VenueCard venue={venue} />
                </div>
              )}

              {coaches.length === 0 && !venue && (
                <p className="col-span-2 py-8 text-center text-sm text-muted-foreground">
                  Aucune information disponible.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Transferts */}
      {active === 'transfers' && (
        <div className="flex flex-col gap-3">
          {transfersUnavailable ? (
            <UnavailableCard />
          ) : teamTransfers.length > 0 ? (
            <div className="rounded-xl border border-border/60 bg-card">
              {teamTransfers.slice(0, 5).map((transfer) => (
                <TransfersTimeline key={transfer.playerId} transfers={transfer} />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun transfert disponible.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
