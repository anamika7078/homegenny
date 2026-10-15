'use client';

import { createContext, useContext } from 'react';

export interface ShellContextValue {
  /** Mobile drawer open. */
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  /** Desktop: sidebar shrunk to icons. Remembered per browser. */
  collapsed: boolean;
  toggleCollapsed: () => void;
}

export const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error('useShell must be used within AppShell');
  }
  return ctx;
}
