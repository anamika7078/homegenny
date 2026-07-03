import { cn } from '@/lib/utils/cn';

export function PageHeader({ title, subtitle, children, className }: {
  title: string; subtitle?: string; children?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-lg font-display font-bold text-white sm:text-xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{children}</div>
      )}
    </div>
  );
}
