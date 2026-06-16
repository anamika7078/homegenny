'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const save = async () => {
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    const phone = sessionStorage.getItem('hg_reset_phone');
    const otp = sessionStorage.getItem('hg_reset_otp');
    if (!phone || !otp) {
      toast.error('Session expired');
      router.push('/auth/forgot-password');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(phone, otp, password);
      sessionStorage.removeItem('hg_reset_phone');
      sessionStorage.removeItem('hg_reset_otp');
      toast.success('Password updated');
      router.push('/auth/login');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-white">Reset password</h1>
        <Input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button className="w-full" onClick={save} disabled={loading}>
          {loading ? 'Saving...' : 'Save password'}
        </Button>
        <Link href="/auth/login" className="block text-center text-sm text-primary">
          Back to login
        </Link>
      </div>
    </div>
  );
}
