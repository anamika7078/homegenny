import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

const VARIANTS: Record<string, string> = {
  default:   'bg-[#FF5A1F] text-white hover:bg-[#E04B1A] active:bg-[#C7411A] shadow-lg shadow-[#FF5A1F]/20 hover:shadow-[#FF5A1F]/30',
  secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600',
  ghost:     'text-slate-300 hover:bg-slate-800 hover:text-white',
  outline:   'border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white',
  danger:    'bg-red-600 text-white hover:bg-red-700',
  success:   'bg-green-700 text-white hover:bg-green-600',
};
const SIZES: Record<string, string> = {
  sm:      'h-9 min-w-[80px] px-4 text-xs',
  default: 'h-11 min-w-[120px] px-5 text-sm',
  lg:      'h-12 min-w-[160px] px-8 text-base',
  icon:    'h-10 w-10',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS; size?: keyof typeof SIZES;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/60',
        'disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none',
        VARIANTS[variant], SIZES[size], className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';