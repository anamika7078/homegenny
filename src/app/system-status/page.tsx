'use client';

import { RoleRedirect } from '@/components/layout/role-redirect';

/** This page showed a fixed list of services, not their live state. Admin → System Health shows the scheduled jobs as they run. */
const TO = { ADMIN: '/admin/system-health', BM: '/monitoring' };

export default function Page() {
  return <RoleRedirect to={TO} />;
}
