'use client';

import { RoleRedirect } from '@/components/layout/role-redirect';

/** This page showed fixed sample figures. Each role's reports page has the real numbers. */
const TO = { RM: '/rm/reports', BM: '/rm/reports', ADMIN: '/admin/analytics', FINANCE: '/finance/analytics', TRAINER: '/trainer/reports' };

export default function Page() {
  return <RoleRedirect to={TO} />;
}
