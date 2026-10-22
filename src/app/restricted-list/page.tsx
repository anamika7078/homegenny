'use client';

import { RoleRedirect } from '@/components/layout/role-redirect';

/** This page listed sample records. The restricted-list check runs on every S1 intake and stage move. */
const TO = {};

export default function Page() {
  return <RoleRedirect to={TO} />;
}
