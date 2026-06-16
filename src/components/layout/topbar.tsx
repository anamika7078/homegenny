'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils/cn';
import { LogOut, Plus } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { api } from '@/lib/api/client';
import { disconnectSocket } from '@/lib/api/socket';

/** BM header counts — replace with API / store when alarms are live */
const CRITICAL_COUNT = 3;
const HIGH_COUNT = 5;

const BM_RM_DASHBOARD = new Set(['/bm/dashboard', '/rm/dashboard']);

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [isScrolled, setIsScrolled] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isDashboardHome = pathname != null && BM_RM_DASHBOARD.has(pathname);
  const isBmDashboard = pathname === '/bm/dashboard';

  const displayName = useMemo(() => {
    const raw = user?.full_name?.trim();
    if (!raw) return 'there';
    return raw.split(/\s+/)[0] ?? 'there';
  }, [user?.full_name]);

  const dateLine = useMemo(() => format(new Date(), 'EEEE, d MMMM yyyy'), []);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await api.logout();
    } catch {
      // clear session even if API fails
    }
    disconnectSocket();
    logout();
    router.replace('/auth/login');
  }, [loggingOut, logout, router]);

  useEffect(() => {
    const main = document.querySelector('[data-app-main-scroll]');
    if (!(main instanceof HTMLElement)) {
      const onWin = () => setIsScrolled(window.scrollY > 0);
      window.addEventListener('scroll', onWin, { passive: true });
      return () => window.removeEventListener('scroll', onWin);
    }
    const handleScroll = () => setIsScrolled(main.scrollTop > 0);
    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => main.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'z-30 flex shrink-0 items-center justify-between px-6 transition-all duration-300 lg:px-8',
        'bg-[#0b0f19]',
        isDashboardHome ? 'h-[88px]' : 'h-14',
        isScrolled ? 'border-b border-border/50 shadow-xl' : ''
      )}
    >
      <div className="flex min-w-0 flex-col justify-center">
        <h2
          className={cn(
            'truncate font-bold tracking-tight text-white',
            isDashboardHome ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
          )}
        >
          Namaskar, {displayName} ji 🙏
        </h2>
        {isDashboardHome ? (
          <p className="mt-1 text-[11px] font-medium text-secondary-foreground">
            {dateLine} · Delhi NCR Branch · Last sync: 2 min ago
          </p>
        ) : (
          <p className="mt-0.5 truncate text-[10px] font-medium text-secondary-foreground">
            {user?.role?.replace('_', ' ') ?? 'HomeGenny'} · Delhi NCR
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {isBmDashboard && (
          <>
            <Link
              href="/alarms?tab=CRITICAL"
              className="hidden items-center gap-2 rounded-full border border-red-500/50 bg-[#1a1012] px-2.5 py-1.5 transition-opacity hover:opacity-90 sm:inline-flex sm:px-3"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]" />
              <span className="text-[11px] font-bold text-red-400">{CRITICAL_COUNT} Critical</span>
            </Link>

            <Link
              href="/alarms"
              className="hidden items-center gap-2 rounded-full border border-amber-400/45 bg-[#1a160c] px-2.5 py-1.5 transition-opacity hover:opacity-90 sm:inline-flex sm:px-3"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
              <span className="text-[11px] font-bold text-amber-300">{HIGH_COUNT} High</span>
            </Link>

            <button
              type="button"
              onClick={() => router.push('/staff/intake')}
              className="hidden items-center gap-1.5 rounded-full bg-[#FF5A1F] px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-[#FF5A1F]/20 transition-colors hover:bg-[#FF5A1F]/90 sm:flex sm:px-4"
            >
              <Plus className="h-3.5 w-3.5" />
              New Intake
            </button>
          </>
        )}

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          title="Sign out"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-[#151c2c] px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition-colors',
            'hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300',
            'disabled:pointer-events-none disabled:opacity-50'
          )}
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{loggingOut ? 'Signing out…' : 'Logout'}</span>
        </button>
      </div>
    </header>
  );
}
