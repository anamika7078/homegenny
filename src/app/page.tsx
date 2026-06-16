'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth.store';
import { tokenStore } from '@/lib/api/client';
import { getDashboardPath } from '@/lib/rbac/permissions';
import { PageLoader } from '@/components/ui/loading';

export default function RootPage() {
  const router = useRouter();
  const { user, hydrate, isAuthenticated } = useAuthStore();

  useEffect(() => {
    hydrate();
    const token = tokenStore.getAccess();
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    const u = useAuthStore.getState().user;
    if (u?.role) router.replace(getDashboardPath(u.role));
    else router.replace('/rm/dashboard');
  }, [hydrate, router]);

  return <PageLoader />;
}
