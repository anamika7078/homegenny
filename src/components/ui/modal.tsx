'use client';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function Modal({ open, onClose, title, children, className }: {
  open: boolean; onClose: () => void; title?: string;
  children: React.ReactNode; className?: string;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative z-10 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg', className)}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}