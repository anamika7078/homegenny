'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import toast from 'react-hot-toast';

export default function OtpPage() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const verify = async () => {
    const phone = sessionStorage.getItem('hg_reset_phone');
    if (!phone) {
      toast.error('Session expired — request OTP again');
      router.push('/auth/forgot-password');
      return;
    }
    setLoading(true);
    try {
      const res = await api.verifyOtp(phone, otp);
      const valid = (res as { valid?: boolean })?.valid ?? (res as { data?: { valid?: boolean } })?.data?.valid;
      if (!valid) {
        toast.error('Invalid OTP');
        return;
      }
      sessionStorage.setItem('hg_reset_otp', otp);
      router.push('/auth/reset-password');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-white">Verify OTP</h1>
        <Input placeholder="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
        <Button className="w-full" onClick={verify} disabled={loading}>
          {loading ? 'Verifying...' : 'Verify'}
        </Button>
        <Link href="/auth/login" className="block text-center text-sm text-primary">
          Back to login
        </Link>
      </div>
    </div>
  );
}
