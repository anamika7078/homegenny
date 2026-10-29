'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { api } from '@/lib/api/client';
import { disconnectSocket } from '@/lib/api/socket';
import { initials, roleLabel } from './sidebar';

/** The signed-in user's picture; click it for who is signed in and Logout. */
export function ProfileMenu() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const handleLogout = useCallback(() => {
    if (loggingOut) return;
    setLoggingOut(true);
    // The server call goes out in the background and the UI does not wait for
    // it. Signing out used to sit on this request for seconds: an expired
    // access token made it 401, which triggered a token refresh, which the
    // server answered with a bcrypt comparison, and only then did the logout
    // run. api.logout() already carries the token it needs, and this is a
    // client-side navigation, so the request survives the redirect.
    void api.logout();
    disconnectSocket();
    logout();
    router.replace('/auth/login');
  }, [loggingOut, logout, router]);

  const name = user?.full_name ?? 'HomeGenny User';

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        title={name}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF5A1F]/20 text-sm font-bold text-[#FF5A1F] ring-1 ring-[#FF5A1F]/30 transition hover:ring-[#FF5A1F]/60"
      >
        {initials(user?.full_name)}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl">
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF5A1F]/20 text-sm font-bold text-[#FF5A1F]">
              {initials(user?.full_name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{name}</p>
              <p className="truncate text-[11px] text-secondary-foreground">{roleLabel(user?.role)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? 'Signing out…' : 'Logout'}
          </button>
        </div>
      )}
    </div>
  );
}
