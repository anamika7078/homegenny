'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Shared pieces of the collapsible sidebar (both the RM sidebar and the one
 * every other role uses). Collapsing only applies from `lg` up — on a phone the
 * sidebar is a drawer and always shows its labels.
 *
 * The sidebar animates its width; inside it, labels shrink to zero width and
 * fade, so icons never move sideways while it opens or closes.
 */

export const EASE = 'ease-[cubic-bezier(0.4,0,0.2,1)]';

/** A label that folds away when collapsed. */
export function foldLabel(collapsed: boolean, extra?: string) {
  return cn(
    'min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 motion-reduce:transition-none',
    EASE,
    collapsed ? 'max-w-[220px] opacity-100 lg:max-w-0 lg:opacity-0' : 'max-w-[220px] opacity-100',
    extra,
  );
}

/** The gap next to an icon that closes with the label, so the icon centres. */
export function foldGap(collapsed: boolean) {
  return cn('transition-[gap] duration-300 motion-reduce:transition-none', EASE, collapsed ? 'gap-3 lg:gap-0' : 'gap-3');
}

/** Section heading: the words fade out and a short rule takes their place. */
export function SectionHeading({ collapsed, children, className }: { collapsed: boolean; children: React.ReactNode; className?: string }) {
  return (
    <h4 className={cn('relative px-3 text-[10px] font-bold uppercase tracking-widest', className)}>
      <span className={foldLabel(collapsed, 'block')}>{children}</span>
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute left-1/2 top-1/2 hidden h-px w-6 -translate-x-1/2 -translate-y-1/2 bg-white/10 transition-opacity duration-300 lg:block',
          collapsed ? 'opacity-100' : 'opacity-0',
        )}
      />
    </h4>
  );
}

/** The desktop button that collapses / expands the sidebar. */
export function CollapseButton({ collapsed, onToggle, className }: { collapsed: boolean; onToggle: () => void; className?: string }) {
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const label = collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded={!collapsed}
      title={label}
      className={cn(
        'hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/60 lg:inline-flex',
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
