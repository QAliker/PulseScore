import { cn } from '@/lib/utils';
import type { MatchEventEntry, MatchEventType, Match } from '@/lib/types';
import { PlayerPhoto } from './player-photo';

type Props = {
  events: MatchEventEntry[];
  match: Match;
};

function eventIcon(type: MatchEventType): { symbol: string; label: string } {
  switch (type) {
    case 'goal':       return { symbol: '⚽', label: 'Goal' };
    case 'owngoal':    return { symbol: '⚽', label: 'Own goal' };
    case 'yellow':     return { symbol: '🟨', label: 'Yellow card' };
    case 'red':        return { symbol: '🟥', label: 'Red card' };
    case 'yellowred':  return { symbol: '🟨🟥', label: 'Second yellow' };
    case 'sub':        return { symbol: '↕', label: 'Substitution' };
  }
}

function eventColor(type: MatchEventType) {
  switch (type) {
    case 'goal':      return 'text-live';
    case 'owngoal':   return 'text-destructive';
    case 'yellow':    return 'text-amber-500';
    case 'red':
    case 'yellowred': return 'text-destructive';
    case 'sub':       return 'text-muted-foreground';
  }
}

function MinuteLabel({ minute, stoppage }: { minute: number; stoppage?: number }) {
  return (
    <span className="inline-flex min-w-[2.2rem] justify-center rounded bg-muted px-1.5 py-0.5 font-display text-[0.68rem] font-bold tabular text-muted-foreground">
      {stoppage ? `${minute}+${stoppage}'` : `${minute}'`}
    </span>
  );
}

function EventRow({ event, homeTeamName, awayTeamName }: {
  event: MatchEventEntry;
  homeTeamName: string;
  awayTeamName: string;
}) {
  const isSub = event.type === 'sub';
  const { symbol, label } = isSub ? { symbol: '', label: 'Substitution' } : eventIcon(event.type);
  const color = eventColor(event.type);
  const isHome = event.team === 'home';

  return (
    <div
      className="grid grid-cols-[1fr_auto_1fr] items-start gap-2"
      aria-label={`${label}: ${event.playerName}, ${event.minute} minutes, ${isHome ? homeTeamName : awayTeamName}`}
    >
      {/* Home side (left, right-aligned) */}
      <div className={cn('flex flex-col items-end gap-0.5', !isHome && 'invisible')}>
        {isSub ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-emerald-500">{event.playerName}</span>
              <span className="text-sm leading-none text-emerald-500" aria-hidden>↑</span>
              <PlayerPhoto photo={event.playerPhoto} name={event.playerName} side="home" size="sm" />
            </div>
            {event.detail && (
              <div className="flex items-center justify-end gap-1">
                <span className="text-sm font-semibold text-rose-500">{event.detail}</span>
                <span className="text-sm leading-none text-rose-500" aria-hidden>↓</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className={cn('text-sm font-semibold', color)}>{event.playerName}</span>
              <span className={cn('text-base leading-none', color)} aria-hidden>{symbol}</span>
              <PlayerPhoto photo={event.playerPhoto} name={event.playerName} side="home" size="sm" />
            </div>
            {event.type === 'goal' && event.detail && (
              <span className="text-[0.68rem] text-muted-foreground">↳ {event.detail}</span>
            )}
          </>
        )}
      </div>

      {/* Center spine: minute */}
      <div className="flex flex-col items-center pt-0.5">
        <MinuteLabel minute={event.minute} stoppage={event.stoppage} />
      </div>

      {/* Away side (right, left-aligned) */}
      <div className={cn('flex flex-col items-start gap-0.5', isHome && 'invisible')}>
        {isSub ? (
          <>
            <div className="flex items-center gap-1.5">
              <PlayerPhoto photo={event.playerPhoto} name={event.playerName} side="away" size="sm" />
              <span className="text-sm leading-none text-emerald-500" aria-hidden>↑</span>
              <span className="text-sm font-semibold text-emerald-500">{event.playerName}</span>
            </div>
            {event.detail && (
              <div className="flex items-center gap-1">
                <span className="text-sm leading-none text-rose-500" aria-hidden>↓</span>
                <span className="text-sm font-semibold text-rose-500">{event.detail}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <PlayerPhoto photo={event.playerPhoto} name={event.playerName} side="away" size="sm" />
              <span className={cn('text-base leading-none', color)} aria-hidden>{symbol}</span>
              <span className={cn('text-sm font-semibold', color)}>{event.playerName}</span>
            </div>
            {event.type === 'goal' && event.detail && (
              <span className="text-[0.68rem] text-muted-foreground">{event.detail} ↲</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function EventsTimeline({ events, match }: Props) {
  if (match.status === 'scheduled') {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <div className="text-3xl opacity-40">⏱</div>
        <p className="text-sm">Match hasn&apos;t started yet. Events will appear here live.</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <div className="text-3xl opacity-40">⚽</div>
        <p className="text-sm">No events yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Column headers */}
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] gap-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
        <span className="text-right">{match.home.name}</span>
        <span className="invisible min-w-[2.2rem]">—</span>
        <span>{match.away.name}</span>
      </div>

      {/* Spine + events */}
      <div className="relative">
        {/* Vertical center line */}
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/60" aria-hidden />

        <div className="flex flex-col gap-3 py-1">
          {events.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              homeTeamName={match.home.name}
              awayTeamName={match.away.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
