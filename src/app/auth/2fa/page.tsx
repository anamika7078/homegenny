'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth.store';
import { getDashboardPath } from '@/lib/rbac/permissions';
import type { UserRole } from '@/lib/types';
import toast from 'react-hot-toast';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
type Mode = 'verify' | 'setup';          // 'setup' = first-time Admin QR enrollment

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function qrUrl(otpauthUrl: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
}

function parseSecret(otpauthUrl: string): string {
  try {
    const params = new URL(otpauthUrl).searchParams;
    return params.get('secret') ?? otpauthUrl;
  } catch {
    return otpauthUrl;
  }
}

/* ─── Component ─────────────────────────────────────────────────────────────── */
export default function TwoFactorPage() {
  const [code, setCode]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [mode, setMode]         = useState<Mode>('verify');
  const [setupData, setSetupData] = useState<{ secret: string; otpauth_url: string } | null>(null);
  const [setupStep, setSetupStep] = useState<1 | 2>(1);   // 1 = scan QR, 2 = enter code
  const [copied, setCopied]     = useState(false);
  const [resetting, setResetting] = useState(false);

  const { setAuth } = useAuthStore();
  const router = useRouter();

  const applySetupPayload = (body: { totp_secret: string; otpauth_url: string }) => {
    setMode('setup');
    setSetupStep(1);
    setCode('');
    setSetupData({ secret: body.totp_secret, otpauth_url: body.otpauth_url });
    sessionStorage.setItem('hg_totp_otpauth', body.otpauth_url);
    sessionStorage.setItem('hg_totp_secret', body.totp_secret);
  };

  const clearSetupSession = () => {
    sessionStorage.removeItem('hg_totp_otpauth');
    sessionStorage.removeItem('hg_totp_secret');
    setSetupData(null);
    setMode('verify');
    setSetupStep(1);
    setCode('');
  };

  /* Sync with backend — avoid stale QR from sessionStorage after setup is complete */
  useEffect(() => {
    const phone    = sessionStorage.getItem('hg_2fa_phone') ?? '';
    const password = sessionStorage.getItem('hg_2fa_password') ?? '';
    if (!phone || !password) {
      if (sessionStorage.getItem('hg_totp_otpauth')) clearSetupSession();
      return;
    }

    void (async () => {
      try {
        const res     = await api.login(phone.replace(/\D/g, ''), password);
        const payload = (res as { data?: Record<string, unknown> })?.data ?? res;
        const body    = payload as {
          requires_2fa?: boolean;
          requires_totp_setup?: boolean;
          totp_secret?: string;
          otpauth_url?: string;
        };

        if (body.requires_totp_setup && body.otpauth_url && body.totp_secret) {
          applySetupPayload({ secret: body.totp_secret, otpauth_url: body.otpauth_url });
          return;
        }

        if (body.requires_2fa) {
          clearSetupSession();
        }
      } catch {
        // User may still have a configured authenticator — stay on verify screen
        clearSetupSession();
      }
    })();
  }, []);

  /* ── Copy-to-clipboard helper ──────────────────────────────────────────── */
  const copySecret = async () => {
    if (!setupData) return;
    await navigator.clipboard.writeText(setupData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateQr = async () => {
    const phone    = sessionStorage.getItem('hg_2fa_phone') ?? '';
    const password = sessionStorage.getItem('hg_2fa_password') ?? '';
    if (!phone || !password) {
      router.push('/auth/login');
      return;
    }
    setResetting(true);
    try {
      const res     = await api.reset2faSetup(phone.replace(/\D/g, ''), password);
      const payload = (res as { data?: Record<string, unknown> })?.data ?? res;
      const body    = payload as { totp_secret?: string; otpauth_url?: string };
      if (!body.otpauth_url || !body.totp_secret) {
        toast.error('Could not generate a new QR code');
        return;
      }
      applySetupPayload({ secret: body.totp_secret, otpauth_url: body.otpauth_url });
      toast.success('New QR code ready — remove the old HomeGenny entry in your app, then scan this one');
    } catch (e) {
      toast.error((e as Error).message ?? 'Failed to generate new QR code');
    } finally {
      setResetting(false);
    }
  };

  /* ── Submit TOTP code (both verify & setup-confirm modes) ─────────────── */
  const submit = async () => {
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      toast.error('Enter a valid 6-digit code');
      return;
    }
    const phone    = sessionStorage.getItem('hg_2fa_phone') ?? '';
    const password = sessionStorage.getItem('hg_2fa_password') ?? '';
    if (!phone || !password) {
      router.push('/auth/login');
      return;
    }
    setLoading(true);
    try {
      const res     = await api.login(phone.replace(/\D/g, ''), password, code);
      const payload = (res as { data?: Record<string, unknown> })?.data ?? res;
      const body    = payload as {
        access_token?: string;
        refresh_token?: string;
        user?: Record<string, unknown>;
        requires_totp_setup?: boolean;
        totp_secret?: string;
        otpauth_url?: string;
      };

      // Backend still returning setup-required (shouldn't happen after setup, but guard)
      if (body.requires_totp_setup && body.otpauth_url && body.totp_secret) {
        applySetupPayload({ secret: body.totp_secret, otpauth_url: body.otpauth_url });
        return;
      }

      if (!body.access_token || !body.user) {
        toast.error('Invalid 2FA code — please try again');
        setCode('');
        return;
      }

      const user = {
        id:        String(body.user.id),
        full_name: String(body.user.full_name ?? body.user.phone),
        phone:     String(body.user.phone),
        role:      body.user.role as UserRole,
        is_active: Boolean(body.user.is_active ?? true),
        branch_id: (body.user.branch_id as string | null) ?? undefined,
      };
      setAuth(user, body.access_token, body.refresh_token ?? '');

      // Clean up session storage
      sessionStorage.removeItem('hg_2fa_phone');
      sessionStorage.removeItem('hg_2fa_password');
      sessionStorage.removeItem('hg_totp_otpauth');
      sessionStorage.removeItem('hg_totp_secret');

      toast.success(`Welcome back, ${user.full_name}`);
      router.push(getDashboardPath(user.role));
    } catch (e) {
      toast.error((e as Error).message ?? 'Verification failed');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  /* ── Key handler ──────────────────────────────────────────────────────── */
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void submit();
  };

  /* ────────────────────────────────────────────────────────────────────────
     RENDER — Setup Wizard (first-time Admin TOTP enrollment)
  ──────────────────────────────────────────────────────────────────────── */
  if (mode === 'setup' && setupData) {
    const secret = parseSecret(setupData.otpauth_url) || setupData.secret;

    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">
        {/* Ambient glow */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-4">
              <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Set up two-factor authentication</h1>
            <p className="text-slate-400 mt-2 text-sm">Admin accounts require hardware 2FA (TOTP)</p>
          </div>

          {/* Step pills */}
          <div className="flex items-center gap-3 mb-8 justify-center">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all duration-300 ${
                  setupStep >= s
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}>{s}</div>
                {s < 2 && <div className={`h-px w-12 transition-all duration-500 ${setupStep > 1 ? 'bg-orange-500' : 'bg-slate-700'}`} />}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">

            {setupStep === 1 ? (
              /* ── Step 1: Scan QR ────────────────────────────────────────────── */
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Scan QR code</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Open your authenticator app (Google Authenticator, Authy, or any TOTP app) and scan the code below.
                  </p>
                </div>

                {/* QR code */}
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-2xl shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrUrl(setupData.otpauth_url)}
                      alt="TOTP QR code"
                      width={180}
                      height={180}
                      className="block"
                    />
                  </div>
                </div>

                {/* Manual entry key */}
                <div>
                  <p className="text-xs text-slate-500 mb-2 text-center">Can't scan? Enter this key manually:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-orange-300 font-mono tracking-widest text-center break-all">
                      {secret}
                    </code>
                    <button
                      onClick={copySecret}
                      className="flex-shrink-0 p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all"
                      title="Copy key"
                    >
                      {copied ? (
                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setSetupStep(2)}
                  className="w-full py-3 px-6 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/25"
                >
                  I've scanned the code →
                </button>

                <button
                  type="button"
                  onClick={() => void regenerateQr()}
                  disabled={resetting}
                  className="w-full py-2 text-sm text-slate-500 hover:text-orange-300 transition-colors disabled:opacity-50"
                >
                  {resetting ? 'Generating new QR…' : 'Use a new authenticator account (new QR code)'}
                </button>
              </div>
            ) : (
              /* ── Step 2: Confirm OTP ───────────────────────────────────────── */
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Enter verification code</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Enter the 6-digit code shown in your authenticator app to confirm setup.
                  </p>
                </div>

                <div className="relative">
                  <input
                    id="totp-code-input"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={onKey}
                    placeholder="000000"
                    autoFocus
                    className="w-full bg-slate-800/80 border border-slate-700 focus:border-orange-500 rounded-2xl px-5 py-4 text-white text-2xl font-mono tracking-[0.5em] text-center placeholder-slate-600 outline-none transition-all duration-200 focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <button
                  onClick={submit}
                  disabled={loading || code.length !== 6}
                  className="w-full py-3 px-6 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/25 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    'Confirm & Sign In'
                  )}
                </button>

                <button
                  onClick={() => setSetupStep(1)}
                  className="w-full py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  ← Back to QR code
                </button>
              </div>
            )}
          </div>

          {/* Security notice */}
          <div className="mt-6 flex items-start gap-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-slate-400">
              Admin sessions are valid for <span className="text-blue-300 font-semibold">8 hours</span> from login regardless of activity.
              Store your authenticator backup codes securely — you will need them to access this account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────────────────
     RENDER — Standard 2FA verification
  ──────────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-orange-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-4">
            <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Two-factor authentication</h1>
          <p className="text-slate-400 text-sm mt-1">Enter the 6-digit code from your authenticator app</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="relative">
            <input
              id="totp-verify-input"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={onKey}
              placeholder="000000"
              autoFocus
              className="w-full bg-slate-800/80 border border-slate-700 focus:border-orange-500 rounded-2xl px-5 py-4 text-white text-2xl font-mono tracking-[0.5em] text-center placeholder-slate-600 outline-none transition-all duration-200 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <button
            onClick={submit}
            disabled={loading || code.length !== 6}
            className="w-full py-3 px-6 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/25 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Verifying...
              </>
            ) : (
              'Verify & Sign In'
            )}
          </button>

          <Link
            href="/auth/login"
            className="block text-center text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Use another account
          </Link>

          <button
            type="button"
            onClick={() => void regenerateQr()}
            disabled={resetting}
            className="block w-full text-center text-sm text-slate-500 hover:text-orange-300 transition-colors disabled:opacity-50"
          >
            {resetting ? 'Generating new QR…' : 'Set up with a new authenticator (new QR code)'}
          </button>
        </div>

        {/* Session notice */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Admin sessions expire after <span className="text-slate-500">8 hours</span> for security
        </p>
      </div>
    </div>
  );
}
