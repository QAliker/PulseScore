import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getMatchDetail } from '@/lib/mock-data';
import { getLeagueBySlug } from '@/lib/leagues';
import { formatDate, formatKickoff, formatMinute } from '@/lib/format';
import { apiFetch } from '@/lib/api';
import { apiMatchToMatch } from '@/lib/api-match-map';
import type { ApiMatch, ApiMatchLineups } from '@/lib/api-types';
import type { MatchLineups, TeamLineup, MatchEventEntry, MatchEventType, Match } from '@/lib/types';
import { TeamCrest } from '@/components/feed/team-crest';
import { MatchMinute } from '@/components/feed/match-minute';
import { SectionNav } from '@/components/match/section-nav';
import { PitchFormation } from '@/components/match/pitch-formation';
import { LiveEventsSection } from '@/components/match/live-events-section';
import { H2HSection } from '@/components/match/h2h-section';

export const dynamic = 'force-dynamic';

function convertApiLineups(apiLineups: ApiMatchLineups | null): MatchLineups | null {
  if (!apiLineups) return null;
  const convertSide = (side: ApiMatchLineups['home']): TeamLineup => ({
    formation: side.formation,
    starting: side.starting.map((p) => ({ ...p })),
    bench: side.bench.map((p) => ({ ...p })),
    coach: side.coach,
  });
  return { home: convertSide(apiLineups.home), away: convertSide(apiLineups.away) };
}

function buildEvents(match: Match): MatchEventEntry[] {
  const events: MatchEventEntry[] = [];

  match.goalscorers.forEach((g, i) => {
    const minute = parseInt(g.time) || 0;
    const isOwn = g.info === 'own goal';
    if (g.homeScorer) {
      events.push({ id: `g-h-${i}`, minute, type: isOwn ? 'owngoal' : 'goal', team: 'home', playerName: g.homeScorer });
    }
    if (g.awayScorer) {
      events.push({ id: `g-a-${i}`, minute, type: isOwn ? 'owngoal' : 'goal', team: 'away', playerName: g.awayScorer });
    }
  });

  match.cards.forEach((c, i) => {
    const minute = parseInt(c.time) || 0;
    const type: MatchEventType = c.card === 'red card' ? 'red' : c.card === 'yellow-red card' ? 'yellowred' : 'yellow';
    if (c.homeFault) events.push({ id: `c-h-${i}`, minute, type, team: 'home', playerName: c.homeFault });
    if (c.awayFault) events.push({ id: `c-a-${i}`, minute, type, team: 'away', playerName: c.awayFault });
  });

  match.substitutions.forEach((s, i) => {
    const minute = parseInt(s.time) || 0;
    if (s.playerIn) {
      events.push({ id: `s-${s.team}-${i}`, minute, type: 'sub', team: s.team, playerName: s.playerIn, detail: s.playerOut ?? undefined });
    }
  });

  return events.sort((a, b) => a.minute - b.minute);
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const apiMatch = await apiFetch<ApiMatch>(`/matches/${id}`).catch(() => null);
  if (!apiMatch) notFound();

  const match = apiMatchToMatch(apiMatch);
  const league = getLeagueBySlug(match.leagueSlug);
  const detail = getMatchDetail(id, match);
  const lineups = convertApiLineups(apiMatch.lineups);
  const events = buildEvents(match);
  const statistics = apiMatch.statistics ?? [];

  return (
    <div className="mx-auto flex max-w-225 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        All matches
      </Link>

      <section className="relative overflow-hidden rounded-2xl pitch-grass">
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/55 via-black/15 to-transparent" aria-hidden />
        <div className="relative flex flex-col gap-6 p-6 text-pitch-foreground sm:p-10">
          <header className="flex items-center justify-between text-[0.72rem] font-semibold uppercase tracking-[0.18em] opacity-90">
            <span>{league ? `${league.flag} ${league.name}` : ''}</span>
            <span>{formatDate(match.kickoff)} · {formatKickoff(match.kickoff)}</span>
          </header>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <TeamCrest shortName={match.home.shortName} logo={match.home.logo} side="home" size="lg" />
              <span className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
                {match.home.name}
              </span>
            </div>

            <div className="flex flex-col items-center gap-2">
              {match.status === 'scheduled' ? (
                <span className="font-display text-3xl font-extrabold opacity-80">vs</span>
              ) : (
                <span className="font-display tabular text-white">
                  <span className="text-6xl font-black leading-none sm:text-7xl">
                    {match.homeScore}
                  </span>
                  <span className="mx-3 text-3xl opacity-50">–</span>
                  <span className="text-6xl font-black leading-none sm:text-7xl">
                    {match.awayScore}
                  </span>
                </span>
              )}
              <MatchMinute match={match} />
            </div>

            <div className="flex flex-col items-center gap-3 text-center">
              <TeamCrest shortName={match.away.shortName} logo={match.away.logo} side="away" size="lg" />
              <span className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
                {match.away.name}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-xl border border-border/60 bg-card p-4 text-sm sm:grid-cols-3">
        <DetailCell label="Kickoff" value={`${formatDate(match.kickoff)} · ${formatKickoff(match.kickoff)}`} />
        <DetailCell label="Status" value={formatMinute(match)} />
        <DetailCell
          label="1X2 odds"
          value={
            match.odds
              ? `${match.odds.home.toFixed(2)} · ${match.odds.draw.toFixed(2)} · ${match.odds.away.toFixed(2)}`
              : '—'
          }
        />
      </section>

      <SectionNav />

      <section id="lineups" className="scroll-mt-28 flex flex-col gap-3">
        <SectionHeading>Lineups</SectionHeading>
        <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
          {lineups ? (
            <PitchFormation lineups={lineups} match={match} />
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <div className="text-3xl opacity-40">📋</div>
              <p className="text-sm">Lineups not available yet.</p>
            </div>
          )}
        </div>
      </section>

      <section id="events" className="scroll-mt-28 flex flex-col gap-3">
        <SectionHeading>Timeline</SectionHeading>
        <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
          <LiveEventsSection initialEvents={events} match={match} />
        </div>
      </section>

      {statistics.length > 0 && (
        <section id="stats" className="scroll-mt-28 flex flex-col gap-3">
          <SectionHeading>Statistics</SectionHeading>
          <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
            <div className="flex flex-col gap-3">
              {statistics.map((s) => {
                const homeNum = parseFloat(s.home) || 0;
                const awayNum = parseFloat(s.away) || 0;
                const total = homeNum + awayNum;
                const homePct = total > 0 ? (homeNum / total) * 100 : 50;
                return (
                  <div key={s.type} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[0.72rem] font-semibold">
                      <span className="tabular">{s.home}</span>
                      <span className="text-muted-foreground uppercase tracking-[0.12em]">{s.type}</span>
                      <span className="tabular">{s.away}</span>
                    </div>
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="bg-home rounded-l-full" style={{ width: `${homePct}%` }} />
                      <div className="bg-away rounded-r-full flex-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section id="h2h" className="scroll-mt-28 flex flex-col gap-3">
        <SectionHeading>Head to Head</SectionHeading>
        <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
          <H2HSection h2h={detail.h2h} match={match} />
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </h2>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className="font-semibold tabular">{value}</span>
    </div>
  );
}
