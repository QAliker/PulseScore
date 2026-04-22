'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Match, SocketStatus } from '@/lib/types';
import type { ApiMatch } from '@/lib/api-types';
import { apiMatchesToMatches } from '@/lib/api-match-map';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type Listener = (matches: Match[]) => void;

export type UseSocketResult = {
  status: SocketStatus;
  subscribe: (listener: Listener) => () => void;
};

export function useSocket(enabled = true): UseSocketResult {
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const listenersRef = useRef<Set<Listener>>(new Set());
  const esRef = useRef<EventSource | null>(null);

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    function connect() {
      const es = new EventSource(`${API_URL}/livescore/stream`);
      esRef.current = es;

      es.onopen = () => setStatus('live');

      es.onmessage = (event: MessageEvent<string>) => {
        try {
          const raw = JSON.parse(event.data) as ApiMatch[];
          const matches = apiMatchesToMatches(raw);
          listenersRef.current.forEach((l) => l(matches));
        } catch {
          // malformed frame — ignore
        }
      };

      es.onerror = () => {
        setStatus('reconnecting');
        es.close();
        esRef.current = null;
        setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [enabled]);

  return { status, subscribe };
}
