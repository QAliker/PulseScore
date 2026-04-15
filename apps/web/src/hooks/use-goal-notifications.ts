'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { Match } from '@/lib/types';
import type { FlashEntry } from './use-live-scores';

const SOUND_KEY = 'pulse-sound-enabled';
const TITLE_BASE = 'PulseScore Arena — Live Football Scores';

function isSoundEnabled() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SOUND_KEY) === '1';
}

function playGoalBeep() {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.4);
  } catch {}
}

/**
 * Watches fresh flashes and fires: sonner toast, title flash, optional sound.
 * Only fires for flashes seen AFTER mount — initial SSR state never toasts.
 */
export function useGoalNotifications(flashes: FlashEntry[], matches: Match[]) {
  const seenRef = useRef<Set<string>>(new Set());
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedAt = useRef<number>(0);

  useEffect(() => {
    mountedAt.current = Date.now();
    // Seed seen with any flashes already present at mount to avoid replay.
    flashes.forEach((f) => seenRef.current.add(`${f.matchId}:${f.at}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    for (const f of flashes) {
      const key = `${f.matchId}:${f.at}`;
      if (seenRef.current.has(key)) continue;
      seenRef.current.add(key);
      if (f.at <= mountedAt.current) continue;

      const m = matches.find((x) => x.id === f.matchId);
      if (!m) continue;

      const scoreLine = `${m.home.shortName} ${m.homeScore} – ${m.awayScore} ${m.away.shortName}`;
      const scorerName = f.scorer === 'home' ? m.home.name : m.away.name;

      toast(`⚽ Goal — ${scorerName}`, {
        description: `${scoreLine} · ${m.minute ?? ''}'`,
        duration: 4000,
      });

      if (typeof document !== 'undefined' && document.hidden) {
        document.title = `⚽ ${scoreLine} · ${TITLE_BASE}`;
        if (titleTimer.current) clearTimeout(titleTimer.current);
        titleTimer.current = setTimeout(() => {
          document.title = TITLE_BASE;
        }, 6000);
      }

      if (isSoundEnabled()) playGoalBeep();
    }
  }, [flashes, matches]);

  useEffect(() => {
    const restore = () => {
      if (!document.hidden) document.title = TITLE_BASE;
    };
    document.addEventListener('visibilitychange', restore);
    return () => document.removeEventListener('visibilitychange', restore);
  }, []);
}

export function setSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? '1' : '0');
  } catch {}
}

export function getSoundEnabled() {
  return isSoundEnabled();
}
