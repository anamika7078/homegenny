'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils/cn';
import { Plus, Menu } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { useShell } from './shell-context';
import { AttentionBell } from './attention-bell';
import { ProfileMenu } from './profile-menu';
import { roleLabel } from './sidebar';

const BM_RM_DASHBOARD = new Set(['/bm/dashboard', '/rm/dashboard']);

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { toggleSidebar } = useShell();
  const [isScrolled, setIsScrolled] = useState(false);

  const isDashboardHome = pathname != null && BM_RM_DASHBOARD.has(pathname);
  const isBmDashboard = pathname === '/bm/dashboard';

  const dateLine = useMemo(() => format(new Date(), 'EEEE, d MMMM yyyy'), []);

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
        'z-30 flex shrink-0 items-center justify-between gap-3 px-4 transition-all duration-300 sm:px-6 lg:px-8',
        'bg-[#0b0f19]',
        isDashboardHome ? 'h-[72px] sm:h-[88px]' : 'h-14',
        isScrolled ? 'border-b border-border/50 shadow-xl' : ''
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Open navigation menu"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-[#151c2c] text-secondary-foreground transition-colors hover:bg-white/10 hover:text-white lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 flex-col justify-center">
          {/* Which portal this is — the role, large. Who is signed in is in the profile menu. */}
          <h2
            className={cn(
              'truncate font-bold uppercase tracking-wide text-white',
              isDashboardHome ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
            )}
          >
            {roleLabel(user?.role)}
          </h2>
          {isDashboardHome && (
            <p className="mt-0.5 hidden text-[11px] font-medium text-secondary-foreground sm:block">
              {dateLine}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {isBmDashboard && (
          <>
            <button
              type="button"
              onClick={() => router.push('/rm/intake')}
              className="hidden items-center gap-1.5 rounded-full bg-[#FF5A1F] px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-[#FF5A1F]/20 transition-colors hover:bg-[#FF5A1F]/90 sm:flex sm:px-4"
            >
              <Plus className="h-3.5 w-3.5" />
              New Intake
            </button>
          </>
        )}

        {(user?.role === 'FINANCE' || user?.role === 'ADMIN') && <AttentionBell />}
        <ProfileMenu />
      </div>
    </header>
  );
}
