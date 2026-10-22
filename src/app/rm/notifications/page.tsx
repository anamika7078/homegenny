'use client';

import { RoleRedirect } from '@/components/layout/role-redirect';

/** This page had no notifications behind it: nothing sends RM in-app notifications yet. */
const TO = {};

export default function Page() {
  return <RoleRedirect to={TO} />;
}
