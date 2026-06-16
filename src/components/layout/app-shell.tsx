'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth.store';
import { apiClient } from '@/lib/api/client';
import { Sidebar } from './sidebar';
import { RmSidebar } from './rm-sidebar';
import { Topbar } from './topbar';
import { PageLoader } from '@/components/ui/loading';
import { usePathname, useRouter } from 'next/navigation';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout, hydrate } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isRmPortal = pathname?.startsWith('/rm');
  const isRmUser = user?.role === 'RM';
  const showRmSidebar = isRmUser || isRmPortal;

  useEffect(() => {
    hydrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Must read from the store here, not from hook closure: on first paint
    // `isAuthenticated` is still false while `hydrate()` runs in the effect above.
    // That effect updates Zustand synchronously, but this effect's `isAuthenticated`
    // binding is stale until the next render — which incorrectly sent users to login on refresh.
    const { isAuthenticated: authed, user: u } = useAuthStore.getState();
    if (!authed) {
      router.replace('/auth/login');
      return;
    }
    if (!u) {
      apiClient.get('/auth/me')
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

  if (!isAuthenticated) return <PageLoader />;
  if (!user)            return <PageLoader />;

  return (
    <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-background font-figtree">
      {showRmSidebar ? <RmSidebar /> : <Sidebar />}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <main data-app-main-scroll className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}

