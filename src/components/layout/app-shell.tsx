'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/lib/store/auth.store';
import { api } from '@/lib/api/client';
import { Sidebar } from './sidebar';
import { RmSidebar } from './rm-sidebar';
import { Topbar } from './topbar';
import { PageLoader } from '@/components/ui/loading';
import { usePathname, useRouter } from 'next/navigation';
import { ShellContext } from './shell-context';
import { cn } from '@/lib/utils/cn';

const COLLAPSED_KEY = 'hg.sidebar.collapsed';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout, hydrate } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isRmPortal = pathname?.startsWith('/rm');
  const isRmUser = user?.role === 'RM';
  const showRmSidebar = isRmUser || isRmPortal;

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // Desktop collapse, remembered in this browser. Read after mount so the
  // server render and the first client render agree.
  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSED_KEY) === '1') setCollapsed(true);
    } catch { /* storage blocked: start expanded */ }
  }, []);
  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0'); } catch { /* not remembered */ }
      return next;
    });
  }, []);

  // Ctrl+B / Cmd+B, except while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'b') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      toggleCollapsed();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggleCollapsed]);

  const shellValue = useMemo(
    () => ({ sidebarOpen, setSidebarOpen, toggleSidebar, collapsed, toggleCollapsed }),
    [sidebarOpen, toggleSidebar, collapsed, toggleCollapsed],
  );

  useEffect(() => {
    hydrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const { isAuthenticated: authed, user: u } = useAuthStore.getState();
    if (!authed) {
      router.replace('/auth/login');
      return;
    }
    if (!u) {
      api.me()
        .then((body: any) => {
          const data = body?.data !== undefined ? body.data : body;
          if (data?.id) {
            useAuthStore.setState({
              user: data,
              permissions: data.permissions ?? [],
              isAuthenticated: true,
            });
          } else {
            logout();
            router.replace('/auth/login');
          }
        })
        .catch(() => {
          logout();
          router.replace('/auth/login');
        });
    }
  }, [isAuthenticated, user, router, logout]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  if (!isAuthenticated) return <PageLoader />;
  if (!user) return <PageLoader />;

  return (
    <ShellContext.Provider value={shellValue}>
      <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-background font-figtree">
        {/* Mobile backdrop */}
        <button
          type="button"
          aria-label="Close navigation menu"
          className={cn(
            'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden',
            sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          onClick={() => setSidebarOpen(false)}
        />

        {showRmSidebar ? (
          <RmSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
        ) : (
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar />
          <main data-app-main-scroll className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
            {children}
          </main>
        </div>
      </div>
    </ShellContext.Provider>
  );
}
