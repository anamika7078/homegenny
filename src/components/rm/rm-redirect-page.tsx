'use client';

import { useEffect } from 'react';
import { PageLoader } from '@/components/ui/loading';

export function RmRedirectPage({ href }: { href: string }) {
  useEffect(() => {
    window.location.href = href;
  }, [href]);
  return <PageLoader />;
}
