'use client';

import { io, Socket } from 'socket.io-client';
import { tokenStore } from './client';

const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ||
  (process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001');

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (typeof window === 'undefined') {
    throw new Error('Socket only available in browser');
  }
  if (!socket) {
    socket = io(`${WS_BASE}/events`, {
      auth: { token: tokenStore.getAccess() },
      transports: ['websocket', 'polling'],
    });
  }
  const token = tokenStore.getAccess();
  if (token) socket.auth = { token };
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
