'use client';

import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'pulse-favorites';
const EVENT = 'pulse-favorites-change';

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function write(next: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

function subscribe(cb: () => void) {
  window.addEventListener('storage', cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener(EVENT, cb);
  };
}

let cache: string[] = [];
let cacheRaw = '';
function getSnapshot(): string[] {
  const raw = typeof window === 'undefined' ? '' : localStorage.getItem(KEY) ?? '';
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      cache = raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      cache = [];
    }
  }
  return cache;
}

function getServerSnapshot(): string[] {
  return [];
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    write(next);
  }, []);

  const has = useCallback((id: string) => favorites.includes(id), [favorites]);

  return { favorites, toggle, has };
}
