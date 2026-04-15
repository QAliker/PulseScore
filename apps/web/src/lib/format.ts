import type { Match } from './types';

// Server TZ from env (defaults to Europe/Paris per project .env).
const TZ = process.env.NEXT_PUBLIC_APP_TZ ?? 'Europe/Paris';

const kickoffFmt = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TZ,
});

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: TZ,
});

export function formatKickoff(iso: string) {
  return kickoffFmt.format(new Date(iso));
}

export function formatDate(iso: string) {
  return dateFmt.format(new Date(iso));
}

export function formatMinute(m: Match): string {
  if (m.status === 'halftime') return 'HT';
  if (m.status === 'finished') return 'FT';
  if (m.status === 'postponed') return 'PPD';
  if (m.status === 'scheduled') return formatKickoff(m.kickoff);
  if (m.minute == null) return '';
  if (m.stoppage && m.minute >= 90) return `90+${m.stoppage}'`;
  return `${m.minute}'`;
}

export function formatFreshness(isoUpdated: string, now: number = Date.now()): string {
  const diff = Math.max(0, Math.floor((now - new Date(isoUpdated).getTime()) / 1000));
  if (diff < 5) return 'now';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

export function formatScore(n: number): string {
  return String(n);
}
