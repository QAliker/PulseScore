import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getMatchDetail } from '@/lib/mock-data';
import { getLeagueBySlug } from '@/lib/leagues';
import { formatDate, formatKickoff, formatMinute } from '@/lib/format';
import { apiFetch } from '@/lib/api';
import { apiMatchToMatch } from '@/lib/api-match-map';
import { extractLogoColor } from '@/lib/extract-color';
import type { ApiMatch, ApiMatchLineups, ApiInjury, ApiPrediction, ApiH2h } from '@/lib/api-types';
import type { MatchLineups, TeamLineup, Match, H2HStats } from '@/lib/types';
import { TeamCrest } from '@/components/feed/team-crest';
import { MatchMinute } from '@/components/feed/match-minute';
import { SectionNav } from '@/components/match/section-nav';
import { LineupCards } from '@/components/match/lineup-cards';
import { H2HSection } from '@/components/match/h2h-section';
import { InjuriesSection } from '@/components/match/injuries-section';
import { PredictionSection } from '@/components/match/prediction-section';

export const dynamic = 'force-dynamic';

function convertApiLineups(apiLineups: ApiMatchLineups | null): MatchLineups | null {
  if (!apiLineups) return null;
  const convertSide = (side: ApiMatchLineups['home']): TeamLineup => ({
    formation: side.formation,
    starting: side.starting.map((p) => ({ ...p, photo: p.photo ?? null })),
    bench: side.bench.map((p) => ({ ...p, photo: p.photo ?? null })),
    coach: side.coach,
  });
  return { home: convertSide(apiLineups.home), away: convertSide(apiLineups.away) };
}


function apiH2hToStats(data: ApiH2h, homeId: string, awayId: string): H2HStats {
  const matches = data.headToHead
    .filter((m) => m.status === 'FINISHED')
    .slice(0, 10)
    .map((m) => ({
      id: m.externalId,
      date: new Date(m.startTime).toISOString().split('T')[0],
      homeTeamName: m.homeTeam.name,
      awayTeamName: m.awayTeam.name,
      homeTeamId: m.homeTeam.externalId,
      awayTeamId: m.awayTeam.externalId,
      homeTeamLogo: m.homeTeam.logo ?? undefined,
      awayTeamLogo: m.awayTeam.logo ?? undefined,
      homeScore: m.homeScore ?? 0,
      awayScore: m.awayScore ?? 0,
    }));

  let homeWins = 0, draws = 0, awayWins = 0;
  for (const m of matches) {
    const isHome = m.homeTeamId === homeId;
    const homeTeamScore = isHome ? m.homeScore : m.awayScore;
    const awayTeamScore = isHome ? m.awayScore : m.homeScore;
    if (homeTeamScore > awayTeamScore) homeWins++;
    else if (homeTeamScore < awayTeamScore) awayWins++;
    else draws++;
  }
  return { matches, homeWins, draws, awayWins };
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const apiMatch = await apiFetch<ApiMatch>(`/matches/${id}`, { cache: 'no-store' }).catch(() => null);
  if (!apiMatch) notFound();

  const match = apiMatchToMatch(apiMatch);
  const league = getLeagueBySlug(match.leagueSlug);
  const detail = getMatchDetail(id, match);
  const lineups = convertApiLineups(apiMatch.lineups);

  const externalId = apiMatch.externalId;
  const homeExternalId = apiMatch.homeTeam.externalId;
  const awayExternalId = apiMatch.awayTeam.externalId;

  const [injuries, prediction, h2hData, homeColor, awayColor] = await Promise.all([
    apiFetch<ApiInjury[]>(`/fixtures/${externalId}/injuries`).catch(() => [] as ApiInjury[]),
    apiFetch<ApiPrediction>(`/fixtures/${externalId}/predictions`).catch(() => null),
    apiFetch<ApiH2h>(`/h2h/${homeExternalId}/${awayExternalId}`).catch(() => null),
    match.home.logo ? extractLogoColor(match.home.logo) : Promise.resolve(null),
    match.away.logo ? extractLogoColor(match.away.logo) : Promise.resolve(null),
  ]);

  const statistics = apiMatch.statistics ?? [];
  const h2hStats = h2hData
    ? apiH2hToStats(h2hData, homeExternalId, awayExternalId)
    : detail.h2h;

  const visibleSections = [
    'lineups',
    ...(statistics.length > 0 ? ['stats'] : []),
    ...(injuries.length > 0 ? ['injuries'] : []),
    ...(prediction ? ['prediction'] : []),
    'h2h',
  ];

  const teamColorStyle = {
    ...(homeColor && { '--home': homeColor }),
    ...(awayColor && { '--away': awayColor }),
  } as React.CSSProperties;

  return (
    <div className="mx-auto flex max-w-225 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8" style={teamColorStyle}>
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
            <span className="inline-flex items-center gap-1.5">
                {league && <Image src={league.logo} alt="" width={14} height={14} className={`size-3.5 object-contain${league.darkInvert ? ' dark:invert' : ''}`} unoptimized />}
                {league?.name ?? ''}
              </span>
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

      <SectionNav visibleSections={visibleSections} />

      <section id="lineups" className="scroll-mt-28 flex flex-col gap-3">
        <SectionHeading>Lineups</SectionHeading>
        <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
          {lineups ? (
            <LineupCards lineups={lineups} match={match} />
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <p className="text-sm">Lineups not available yet.</p>
            </div>
          )}
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

      {injuries.length > 0 && (
        <section id="injuries" className="scroll-mt-28 flex flex-col gap-3">
          <SectionHeading>Injuries</SectionHeading>
          <div className="rounded-xl border border-border/60 bg-card">
            <InjuriesSection
              injuries={injuries}
              homeTeamId={homeExternalId}
              awayTeamId={awayExternalId}
              homeTeamName={match.home.name}
              awayTeamName={match.away.name}
            />
          </div>
        </section>
      )}

      {prediction && (
        <section id="prediction" className="scroll-mt-28 flex flex-col gap-3">
          <SectionHeading>Prediction</SectionHeading>
          <div className="rounded-xl border border-border/60 bg-card">
            <PredictionSection
              prediction={prediction}
              homeTeamName={match.home.name}
              awayTeamName={match.away.name}
            />
          </div>
        </section>
      )}

      <section id="h2h" className="scroll-mt-28 flex flex-col gap-3">
        <SectionHeading>Head to Head</SectionHeading>
        <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
          <H2HSection h2h={h2hStats} match={match} />
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
