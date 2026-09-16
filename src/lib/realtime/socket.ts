'use client';

import { io, Socket } from 'socket.io-client';
import { tokenStore } from '@/lib/api/client';

let socket: Socket | null = null;

function wsBaseUrl(): string {
  const api =
    process.env['NEXT_PUBLIC_API_URL'] ||
    (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? `${window.location.origin}/api/v1`
      : 'http://localhost:3001/api/v1');
  return api.replace(/\/api\/v1\/?$/, '');
}

export function getRealtimeSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  // Any existing socket is reused, not just a connected one. The check used to
  // be `socket?.connected`, so calling this while the first socket was still
  // connecting built a second one and left the first running — a component
  // that mounted twice ended up with two live connections per user.
  if (socket) {
    const current = tokenStore.getAccess();
    if (current) socket.auth = { token: current };
    return socket;
  }

  const token = tokenStore.getAccess();
  if (!token) return null;

  socket = io(`${wsBaseUrl()}/events`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
  });

  // The server disconnects a socket whose token has expired. socket.io does
  // not reconnect after a server-side disconnect, so real-time alerts simply
  // stopped arriving, silently, once the access token aged out. Reconnect by
  // hand with whatever token is current — the HTTP client keeps it fresh.
  socket.on('disconnect', (reason) => {
    if (reason !== 'io server disconnect') return;
    const current = tokenStore.getAccess();
    if (!current || !socket) return;
    socket.auth = { token: current };
    socket.connect();
  });

  return socket;
}

export function disconnectRealtime(): void {
  socket?.disconnect();
  socket = null;
}
