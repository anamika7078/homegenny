export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size];
  return <div className={`${s} animate-spin rounded-full border-2 border-slate-700 border-t-brand-500`} />;
}
export function PageLoader() {
  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-slate-950 px-4">
      <div className="text-center space-y-4" aria-live="polite" aria-busy="true">
        <Spinner size="lg" />
        <p className="text-sm sm:text-base text-slate-400 leading-tight">Loading HomeGenny...</p>
      </div>
    </div>
  );
}
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-slate-800/60 animate-pulse" />
      ))}
    </div>
  );
}