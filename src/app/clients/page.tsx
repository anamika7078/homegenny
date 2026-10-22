'use client';

import { RoleRedirect } from '@/components/layout/role-redirect';

/** This page listed sample clients and was in no menu. Clients live in Finance → Customers and the RM's requests and placements. */
const TO = { FINANCE: '/finance/customers' };

export default function Page() {
  return <RoleRedirect to={TO} />;
}
