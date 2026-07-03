'use client';

interface RmPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function RmPageHeader({ title, description, actions }: RmPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 sm:shrink-0">{actions}</div>}
    </div>
  );
}
