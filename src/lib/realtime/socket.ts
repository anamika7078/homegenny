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
  if (socket?.connected) return socket;

  const token = tokenStore.getAccess();
  if (!token) return null;

  socket = io(`${wsBaseUrl()}/events`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
  });

  return socket;
}

export function disconnectRealtime(): void {
  socket?.disconnect();
  socket = null;
}
