import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { League } from '@/lib/leagues';
import type { ApiStanding, ApiMatch, ApiScorer } from '@/lib/api-types';
import { LeagueLogo } from '@/components/feed/league-logo';
import { ScorersBoard } from '@/components/scorers/scorers-board';
import { MatchHistory } from '@/components/matches/match-history';
import { GroupStandings } from './group-standings';
import { KnockoutBracket } from './knockout-bracket';

export type CupTab = 'groups' | 'bracket' | 'scorers' | 'results';

const TABS: { id: CupTab; label: string }[] = [
  { id: 'groups', label: 'Groups' },
  { id: 'bracket', label: 'Bracket' },
  { id: 'scorers', label: 'Scorers' },
  { id: 'results', label: 'Results' },
];

export function WorldCupView({
  league,
  slug,
  tab,
  groups,
  matches,
  scorers,
}: {
  league: League;
  slug: string;
  tab: CupTab;
  groups: ApiStanding[];
  matches: ApiMatch[];
  scorers: ApiScorer[];
}) {
  const finishedResults = matches
    .filter((m) => m.status === 'FINISHED')
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <Link
        href="/leagues"
        className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" />
        All leagues
      </Link>

      <header className="flex items-center gap-4">
        <LeagueLogo league={league} size={56} className="size-14" />
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {league.country} · {league.season}
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {league.name}
          </h1>
        </div>
      </header>

      <nav className="flex gap-1 rounded-xl border border-border/60 bg-card p-1">
        {TABS.map(({ id, label }) => (
          <Link
            key={id}
            href={`/leagues/${slug}?tab=${id}`}
            className={`flex-1 rounded-lg py-2 text-center text-sm font-semibold transition-colors ${
              tab === id
                ? 'bg-foreground text-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === 'groups' && <GroupStandings standings={groups} />}
      {tab === 'bracket' && <KnockoutBracket matches={matches} />}
      {tab === 'scorers' && <ScorersBoard scorers={scorers} league={league} />}
      {tab === 'results' && (
        <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-6">
          <MatchHistory matches={finishedResults} emptyMessage="No matches played yet." />
        </div>
      )}
    </div>
  );
}
