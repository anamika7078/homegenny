'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { tokenStore } from '@/lib/api/client';

export default function SessionExpiredPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 text-center">
      <h1 className="text-2xl font-bold text-white">Session expired</h1>
      <p className="mt-2 max-w-sm text-slate-400">Please sign in again to continue working in the RM portal.</p>
      <Button
        className="mt-6"
        onClick={() => {
          tokenStore.clear();
          window.location.href = '/auth/login';
        }}
      >
        Sign in
      </Button>
      <Link href="/auth/login" className="mt-4 text-sm text-primary">
        Go to login
      </Link>
    </div>
  );
}
