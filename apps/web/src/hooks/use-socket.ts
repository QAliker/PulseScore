'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MockSocket } from '@/lib/mock-socket';
import type { Match, MatchEvent, SocketStatus } from '@/lib/types';

type UseSocketOptions = {
  initialMatches: Match[];
  enabled?: boolean;
};

type UseSocketResult = {
  status: SocketStatus;
  subscribe: (listener: (e: MatchEvent) => void) => () => void;
  simulateDrop: () => void;
};

/**
 * WebSocket client abstraction. Currently wraps MockSocket for local dev.
 * Swap the inner implementation for socket.io-client when Feature 3 backend lands —
 * the hook's public shape is stable.
 */
export function useSocket({ initialMatches, enabled = true }: UseSocketOptions): UseSocketResult {
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const socketRef = useRef<MockSocket | null>(null);
  // Freeze initial matches into the ticker the first time the hook runs.
  const initial = useMemo(() => initialMatches, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled) return;
    const sock = new MockSocket(initial);
    socketRef.current = sock;
    const offStatus = sock.onStatus(setStatus);
    sock.connect();
    return () => {
      offStatus();
      sock.disconnect();
      socketRef.current = null;
    };
  }, [enabled, initial]);

  return {
    status,
    subscribe: (listener) => {
      const sock = socketRef.current;
      if (!sock) return () => {};
      return sock.on(listener);
    },
    simulateDrop: () => socketRef.current?.simulateDrop(),
  };
}
