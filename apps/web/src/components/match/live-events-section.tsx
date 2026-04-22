'use client';

import { useEffect, useRef, useState } from 'react';
import type { Match, MatchEventEntry, MatchEvent } from '@/lib/types';
import { useSocket } from '@/hooks/use-socket';
import { EventsTimeline } from './events-timeline';

type Props = {
  initialEvents: MatchEventEntry[];
  match: Match;
};

export function LiveEventsSection({ initialEvents, match }: Props) {
  const [events, setEvents] = useState<MatchEventEntry[]>(initialEvents);
  const counterRef = useRef(0);
  const { subscribe } = useSocket({ initialMatches: [match] });

  useEffect(() => {
    return subscribe((e: MatchEvent) => {
      if (e.matchId !== match.id) return;

      let entry: MatchEventEntry | null = null;
      const id = `live-${++counterRef.current}`;

      if (e.type === 'card') {
        entry = { id, minute: e.minute, type: e.cardType, team: e.team, playerName: e.playerName };
      } else if (e.type === 'sub') {
        entry = { id, minute: e.minute, type: 'sub', team: e.team, playerName: e.playerInName, detail: e.playerOutName };
      } else if (e.type === 'score') {
        entry = { id, minute: e.minute, type: 'goal', team: e.scorer, playerName: 'Goal' };
      }

      if (entry) {
        const newEntry = entry;
        setEvents((prev) => [...prev, newEntry].sort((a, b) => a.minute - b.minute));
      }
    });
  }, [subscribe, match.id]);

  return <EventsTimeline events={events} match={match} />;
}
