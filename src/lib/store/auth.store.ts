import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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

/**
 * The signed-in user survives a page reload.
 *
 * This store used to be memory-only, so every refresh of the page dropped the
 * user to null and AppShell held a full-page loader while it re-fetched
 * /auth/me — a round trip (and, once the access token had expired, a token
 * refresh before it) in front of every single reload. Only the identity is
 * persisted; the tokens themselves stay in tokenStore, which is still the one
 * place that reads and writes them.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
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
        // The access token is the source of truth for "is there a session".
        // A persisted user without one is a leftover from a cleared token, so
        // it gets dropped rather than trusted.
        const access = tokenStore.getAccess();
        if (!access) {
          set({ user: null, permissions: [], isAuthenticated: false });
          return;
        }
        set({ isAuthenticated: true });
      },
    }),
    {
      name: 'hg_auth_user_v1',
      storage: createJSONStorage(() => localStorage),
      // Deliberately not persisting isAuthenticated: it is derived from the
      // token on hydrate(), so a stale `true` can never outlive the token.
      partialize: (state) => ({ user: state.user, permissions: state.permissions }),
    },
  ),
);
