import { LEAGUES } from './leagues';
import type { Match, MatchStatus, Goalscorer, MatchCardEvent, Substitution } from './types';
import type { ApiMatch } from './api-types';

function leagueSlug(externalId: string | null | undefined): string {
  if (!externalId) return 'unknown';
  return LEAGUES.find((l) => String(l.apiFootballId) === externalId)?.slug ?? 'unknown';
}

function abbrev(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 3).toUpperCase();
  return words
    .map((w) => w[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();
}

function mapStatus(status: ApiMatch['status'], progress: string | null): MatchStatus {
  switch (status) {
    case 'LIVE':
      return progress === 'Half Time' ? 'halftime' : 'live';
    case 'FINISHED':
      return 'finished';
    case 'POSTPONED':
    case 'CANCELLED':
      return 'postponed';
    default:
      return 'scheduled';
  }
}

function parseMinute(progress: string | null): { minute: number | null; stoppage: number | null } {
  if (!progress) return { minute: null, stoppage: null };
  const m = progress.match(/^(\d+)(?:\+(\d+))?$/);
  if (!m) return { minute: null, stoppage: null };
  return { minute: parseInt(m[1], 10), stoppage: m[2] ? parseInt(m[2], 10) : null };
}

export function apiMatchToMatch(m: ApiMatch): Match {
  const { minute, stoppage } = parseMinute(m.progress);
  return {
    id: m.externalId,
    leagueSlug: leagueSlug(m.league?.externalId),
    leagueLogo: m.league?.logo ?? undefined,
    leagueName: m.league?.name ?? undefined,
    leagueCountry: m.league?.country ?? undefined,
    venue: m.venue ?? undefined,
    round: m.round ?? undefined,
    kickoff: m.startTime,
    status: mapStatus(m.status, m.progress),
    minute,
    stoppage,
    home: {
      id: m.homeTeam.externalId,
      name: m.homeTeam.name,
      shortName: abbrev(m.homeTeam.name),
      logo: m.homeTeam.logo ?? undefined,
    },
    away: {
      id: m.awayTeam.externalId,
      name: m.awayTeam.name,
      shortName: abbrev(m.awayTeam.name),
      logo: m.awayTeam.logo ?? undefined,
    },
    homeScore: m.homeScore ?? 0,
    awayScore: m.awayScore ?? 0,
    odds: null,
    goalscorers: m.goalscorers.map((g): Goalscorer => ({
      time: g.time,
      homeScorer: g.homeScorer,
      awayScorer: g.awayScorer,
      score: g.score,
      info: g.info,
    })),
    cards: m.cards.map((c): MatchCardEvent => ({
      time: c.time,
      homeFault: c.homeFault,
      awayFault: c.awayFault,
      card: c.card,
      info: c.info,
    })),
    substitutions: (m.substitutions ?? []).map((s): Substitution => ({
      time: s.time,
      team: s.team,
      playerIn: s.playerIn,
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function apiMatchesToMatches(list: ApiMatch[]): Match[] {
  return list.map(apiMatchToMatch);
}
