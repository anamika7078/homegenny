'use client';

import { RoleRedirect } from '@/components/layout/role-redirect';

/** This page showed a sample staff member and sample recordings. Videos are reviewed in Trainer → Video Certs and Admin → Video Certifications. */
const TO = { ADMIN: '/admin/video-certifications', TRAINER: '/trainer/video-cert', RM: '/rm/video', BM: '/rm/video' };

export default function Page() {
  return <RoleRedirect to={TO} />;
}
