import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: string; error?: string; }
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, label, error, children, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>}
    <select ref={ref} className={cn(
      'w-full h-9 rounded-lg bg-slate-800 border border-slate-700 px-3 text-sm text-slate-100',
      'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
      error && 'border-red-500', className
    )} {...props}>{children}</select>
    {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
  </div>
));
Select.displayName = 'Select';