import { cn } from '@/lib/utils/cn';

export function PageHeader({ title, subtitle, children, className }: {
  title: string; subtitle?: string; children?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between mb-6', className)}>
      <div>
        <h1 className="text-xl font-display font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}