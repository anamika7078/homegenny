'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth.store';
import { Input }   from '@/components/ui/input';
import { Button }  from '@/components/ui/button';
import { Spinner } from '@/components/ui/loading';
import { Modal }   from '@/components/ui/modal';
import toast from 'react-hot-toast';
import { getDashboardPath } from '@/lib/rbac/permissions';
import type { UserRole } from '@/lib/types';

type LoginDialog = 'invalid_credentials' | 'other_system' | null;

export default function LoginPage() {
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [dialog, setDialog]     = useState<LoginDialog>(null);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const login = useMutation({
    mutationFn: () => api.login(phone.replace(/\D/g, ''), password),

    onSuccess: (res: any) => {
      const payload = res?.data !== undefined ? res.data : res;

      // First-time Admin: backend provisioned a TOTP secret — show QR wizard
      if (payload?.requires_totp_setup) {
        sessionStorage.setItem('hg_2fa_phone', phone.trim());
        sessionStorage.setItem('hg_2fa_password', password);
        sessionStorage.setItem('hg_totp_otpauth', payload.otpauth_url ?? '');
        sessionStorage.setItem('hg_totp_secret',  payload.totp_secret  ?? '');
        router.push('/auth/2fa');
        return;
      }

      if (payload?.requires_2fa) {
        sessionStorage.setItem('hg_2fa_user_id', payload.user_id);
        sessionStorage.setItem('hg_2fa_phone', phone.trim());
        sessionStorage.setItem('hg_2fa_password', password);
        router.push('/auth/2fa');
        return;
      }
      if (!payload?.access_token || !payload?.user) {
        toast.error('Unexpected response — please try again');
        return;
      }

      const user = {
        id:        payload.user.id,
        full_name: payload.user.full_name ?? payload.user.name ?? payload.user.phone,
        phone:     payload.user.phone,
        role:      payload.user.role as UserRole,
        is_active: payload.user.is_active ?? true,
        branch_id: payload.user.branch_id ?? null,
      };

      setAuth(user, payload.access_token, payload.refresh_token);
      toast.success(`Welcome back, ${user.full_name}`);

      router.push(getDashboardPath(user.role));
    },

    onError: (err: Error & { status?: number; code?: string }) => {
      if (err.status === 409) {
        setDialog('other_system');
        return;
      }
      if (err.status === 401) {
        setDialog('invalid_credentials');
        return;
      }
      // Axios timeout (ECONNABORTED) or network error — likely Render cold-start
      if (
        err.message?.toLowerCase().includes('timeout') ||
        (err as any).code === 'ECONNABORTED' ||
        err.message?.toLowerCase().includes('network')
      ) {
        toast.error('Server is waking up — please wait a few seconds and try again.', { duration: 6000 });
        return;
      }
      toast.error(err.message ?? 'Login failed');
    },
  });

  const handleSubmit = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone)            { toast.error('Enter your phone number'); return; }
    if (cleanPhone.length < 10) { toast.error('Phone must be 10 digits');  return; }
    if (!password)              { toast.error('Enter your password');      return; }
    setDialog(null);
    login.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Home<span className="text-orange-500">Genny</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Staffing Platform — Admin Portal</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">Sign in</h2>

          <Input
            label="Phone Number"
            placeholder="9800000001"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            type="tel"
            inputMode="numeric"
            maxLength={10}
            autoComplete="tel"
            disabled={login.isPending}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            autoComplete="current-password"
            disabled={login.isPending}
          />

          {process.env['NODE_ENV'] !== 'production' && (
            <p className="text-xs text-slate-600">
              API: {process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001/api/v1'}
            </p>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={login.isPending}
          >
            {login.isPending ? <Spinner size="sm" /> : 'Sign In'}
          </Button>
        </div>

        <div className="text-center text-xs text-slate-500 mt-6 space-y-1">
          <p className="font-medium text-slate-400">Password for all: HomeGenny@2024</p>
          <p>9800000001 Branch Manager (BM) · 9800000002 Relationship Manager (RM) · 9800000003 Admin</p>
          <p>9800000004 Finance · 9800000005 Trainer · 9800000006 Assessor</p>
        </div>
      </div>

      <Modal
        open={dialog === 'invalid_credentials'}
        onClose={() => setDialog(null)}
        title="Invalid credentials"
      >
        <p className="text-sm text-slate-300">
          The phone number or password you entered is incorrect. Please check your credentials and try again.
        </p>
        <Button className="w-full mt-4" onClick={() => setDialog(null)}>
          OK
        </Button>
      </Modal>

      <Modal
        open={dialog === 'other_system'}
        onClose={() => setDialog(null)}
        title="Already logged in"
      >
        <p className="text-sm text-slate-300">
          This account is already signed in on another system or browser. Log out there first, then try again here.
        </p>
        <Button className="w-full mt-4" onClick={() => setDialog(null)}>
          OK
        </Button>
      </Modal>
    </div>
  );
}
