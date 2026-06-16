'use client';
import { Toaster as HotToaster } from 'react-hot-toast';
export function Toaster() {
  return (
    <HotToaster position="top-right" toastOptions={{
      duration: 4000,
      style: {
        background: '#1e293b', color: '#f1f5f9',
        border: '1px solid #334155', fontSize: '14px',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      },
      success: { iconTheme: { primary: '#22c55e', secondary: '#0f172a' } },
      error:   { iconTheme: { primary: '#ef4444', secondary: '#0f172a' } },
    }} />
  );
}