'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageLoader } from '@/components/ui/loading';
import { useAuthStore } from '@/lib/store/auth.store';
import { getDashboardPath } from '@/lib/rbac/permissions';
import type { UserRole } from '@/lib/types';

/**
 * Sends a retired page's visitor to where that job lives now: the page named
 * for their role, else their own dashboard. Used for old routes whose screens
 * only ever showed sample data, so a bookmark lands somewhere real instead of
 * on made-up records.
 */
export function RoleRedirect({ to = {} }: { to?: Partial<Record<UserRole, string>> }) {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);

  useEffect(() => {
    if (!role) return;
    router.replace(to[role] ?? getDashboardPath(role));
  }, [role, to, router]);

  return <PageLoader />;
}
