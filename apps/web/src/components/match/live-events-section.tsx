'use client';

import type { Match, MatchEventEntry } from '@/lib/types';
import { EventsTimeline } from './events-timeline';

type Props = {
  initialEvents: MatchEventEntry[];
  match: Match;
};

export function LiveEventsSection({ initialEvents, match }: Props) {
  return <EventsTimeline events={initialEvents} match={match} />;
}
