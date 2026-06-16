import { cn } from '@/lib/utils/cn';
const V: Record<string, string> = {
  default: 'bg-slate-700 text-slate-200',
  blue:    'bg-blue-900/60 text-blue-200 border border-blue-700/50',
  green:   'bg-green-900/60 text-green-200 border border-green-700/50',
  yellow:  'bg-yellow-900/60 text-yellow-200 border border-yellow-700/50',
  red:     'bg-red-900/60 text-red-200 border border-red-700/50',
  orange:  'bg-orange-900/60 text-orange-200 border border-orange-700/50',
  violet:  'bg-violet-900/60 text-violet-200 border border-violet-700/50',
};
export function Badge({ children, variant = 'default', className, style }: {
  children: React.ReactNode; variant?: keyof typeof V; className?: string; style?: React.CSSProperties;
}) {
  return (
    <span style={style} className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', V[variant], className)}>
      {children}
    </span>
  );
}