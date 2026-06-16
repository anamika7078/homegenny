import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; }
export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>}
    <input ref={ref} className={cn(
      'w-full h-9 rounded-lg bg-slate-800 border border-slate-700 px-3 text-sm text-slate-100',
      'placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
      error && 'border-red-500 focus:ring-red-500', className
    )} {...props} />
    {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
  </div>
));
Input.displayName = 'Input';