import type { Match, MatchEvent } from './types';

// Browser-side event emitter simulating a WebSocket ticker.
// Swappable for real socket.io client once Feature 3 backend ships.
type Listener = (e: MatchEvent) => void;
type StatusListener = (s: 'connecting' | 'live' | 'reconnecting' | 'offline') => void;

export class MockSocket {
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private goalTimer: ReturnType<typeof setInterval> | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private matches: Match[] = [];

  constructor(initial: Match[]) {
    this.matches = initial.map((m) => ({ ...m }));
  }

  connect() {
    this.emitStatus('connecting');
    this.connectTimer = setTimeout(() => {
      this.emitStatus('live');
      // Minute ticks every 8s = accelerated match clock.
      this.tickTimer = setInterval(() => this.tickMinute(), 8000);
      // Random goal every 12–22s across live matches.
      this.goalTimer = setInterval(() => this.maybeScore(), 12000);
    }, 400);
  }

  disconnect() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.goalTimer) clearInterval(this.goalTimer);
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.tickTimer = this.goalTimer = this.connectTimer = null;
    this.emitStatus('offline');
  }

  /** Simulate a brief connection drop + recovery (for UI state testing). */
  simulateDrop(durationMs = 3500) {
    this.emitStatus('reconnecting');
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.goalTimer) clearInterval(this.goalTimer);
    setTimeout(() => {
      this.emitStatus('live');
      this.tickTimer = setInterval(() => this.tickMinute(), 8000);
      this.goalTimer = setInterval(() => this.maybeScore(), 12000);
    }, durationMs);
  }

  on(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private emit(e: MatchEvent) {
    this.listeners.forEach((l) => l(e));
  }

  private emitStatus(s: Parameters<StatusListener>[0]) {
    this.statusListeners.forEach((l) => l(s));
  }

  private tickMinute() {
    const now = new Date().toISOString();
    this.matches.forEach((m) => {
      if (m.status !== 'live' || m.minute == null) return;
      m.minute += 1;
      if (m.minute > 90) {
        m.stoppage = (m.stoppage ?? 0) + 1;
      }
      this.emit({
        type: 'tick',
        matchId: m.id,
        minute: m.minute,
        stoppage: m.stoppage,
        updatedAt: now,
      });
    });
  }

  private maybeScore() {
    const live = this.matches.filter((m) => m.status === 'live');
    if (!live.length) return;
    const m = live[Math.floor(Math.random() * live.length)];
    const scorer: 'home' | 'away' = Math.random() > 0.5 ? 'home' : 'away';
    if (scorer === 'home') m.homeScore += 1;
    else m.awayScore += 1;
    const now = new Date().toISOString();
    this.emit({
      type: 'score',
      matchId: m.id,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      scorer,
      minute: m.minute ?? 0,
      updatedAt: now,
    });
  }
}
