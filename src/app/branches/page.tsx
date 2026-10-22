'use client';

import { RoleRedirect } from '@/components/layout/role-redirect';

/** This page listed sample branches. Branches are managed in Admin → Branches. */
const TO = { ADMIN: '/admin/branches' };

export default function Page() {
  return <RoleRedirect to={TO} />;
}
