import { create } from 'zustand';
import { tokenStore } from '@/lib/api/client';
import type { User } from '@/lib/types';

interface AuthState {
  user:            User | null;
  permissions:     string[];
  isAuthenticated: boolean;
  setAuth:         (user: User, access: string, refresh: string) => void;
  setUser:         (user: User) => void;
  setAccessToken:  (token: string) => void;
  logout:          () => void;
  hydrate:         () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:            null,
  permissions:     [],
  isAuthenticated: false,

  setAuth: (user, access, refresh) => {
    tokenStore.setAccess(access);
    tokenStore.setRefresh(refresh);
    tokenStore.setUserId(user.id);
    tokenStore.setSessionCookie();
    set({
      user,
      permissions: user.permissions ?? [],
      isAuthenticated: true,
    });
  },

  setUser: (user) => {
    set({ user, permissions: user.permissions ?? [] });
  },

  setAccessToken: (token) => {
    tokenStore.setAccess(token);
  },

  logout: () => {
    tokenStore.clear();   // FIX 5: tokenStore.clear() now also removes old v1 keys
    set({ user: null, permissions: [], isAuthenticated: false });
  },

  hydrate: () => {
    // FIX 5: reads from v2 keys — stale v1 tokens are ignored
    const access = tokenStore.getAccess();
    if (!access) {
      set({ user: null, isAuthenticated: false });
      return;
    }
    set({ isAuthenticated: true });
  },
}));
