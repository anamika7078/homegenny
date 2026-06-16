'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const sendOtp = async () => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) {
      toast.error('Enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      await api.forgotPassword(clean);
      sessionStorage.setItem('hg_reset_phone', clean);
      toast.success('OTP sent to your registered mobile');
      router.push('/auth/otp');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <MotionForgotForm
        phone={phone}
        setPhone={setPhone}
        loading={loading}
        onSend={sendOtp}
      />
    </div>
  );
}

function MotionForgotForm({
  phone,
  setPhone,
  loading,
  onSend,
}: {
  phone: string;
  setPhone: (v: string) => void;
  loading: boolean;
  onSend: () => void;
}) {
  return (
    <div className="w-full max-w-sm space-y-6">
      <h1 className="text-2xl font-bold text-white">Forgot password</h1>
      <p className="text-sm text-slate-400">We will send an OTP to your registered mobile.</p>
      <Input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Button className="w-full" onClick={onSend} disabled={loading}>
        {loading ? 'Sending...' : 'Send OTP'}
      </Button>
      <Link href="/auth/login" className="block text-center text-sm text-primary">
        Back to login
      </Link>
    </div>
  );
}
