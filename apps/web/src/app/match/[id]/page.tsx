import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getInitialFixtures, getMatchDetail } from '@/lib/mock-data';
import { getLeagueBySlug } from '@/lib/leagues';
import { formatDate, formatKickoff, formatMinute } from '@/lib/format';
import { TeamCrest } from '@/components/feed/team-crest';
import { MatchMinute } from '@/components/feed/match-minute';
import { SectionNav } from '@/components/match/section-nav';
import { PitchFormation } from '@/components/match/pitch-formation';
import { LiveEventsSection } from '@/components/match/live-events-section';
import { H2HSection } from '@/components/match/h2h-section';

export const dynamic = 'force-dynamic';

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = getInitialFixtures().find((m) => m.id === id);
  if (!match) notFound();

  const league = getLeagueBySlug(match.leagueSlug);
  const detail = getMatchDetail(id, match);

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        All matches
      </Link>

      <section className="relative overflow-hidden rounded-2xl pitch-grass">
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/55 via-black/15 to-transparent" aria-hidden />
        <div className="relative flex flex-col gap-6 p-6 text-pitch-foreground sm:p-10">
          <header className="flex items-center justify-between text-[0.72rem] font-semibold uppercase tracking-[0.18em] opacity-90">
            <span>{league ? `${league.flag} ${league.name}` : ''}</span>
            <span>{formatDate(match.kickoff)} · {formatKickoff(match.kickoff)}</span>
          </header>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <TeamCrest shortName={match.home.shortName} side="home" size="lg" />
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
              <TeamCrest shortName={match.away.shortName} side="away" size="lg" />
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
          <PitchFormation lineups={detail.lineups} match={match} />
        </div>
      </section>

      <section id="events" className="scroll-mt-28 flex flex-col gap-3">
        <SectionHeading>Timeline</SectionHeading>
        <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
          <LiveEventsSection initialEvents={detail.events} match={match} />
        </div>
      </section>

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
