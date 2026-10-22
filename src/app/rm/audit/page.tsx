'use client';

import { RoleRedirect } from '@/components/layout/role-redirect';

/** This page showed sample log rows; the audit log API is not open to RMs. Admin → Audit Logs is the real log. */
const TO = { ADMIN: '/admin/audit-logs' };

export default function Page() {
  return <RoleRedirect to={TO} />;
}
