'use client';

import { useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useAuthStore } from '@/lib/store/auth.store';
import { useRouter } from 'next/navigation';
import { getDashboardPath } from '@/lib/rbac/permissions';

export default function HrLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (user && !['HR', 'ADMIN'].includes(user.role)) {
      router.replace(getDashboardPath(user.role));
    }
  }, [user, router]);

  return <AppShell>{children}</AppShell>;
}
