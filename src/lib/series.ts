'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

/**
 * Staff series, as GET /meta/series returns them. The backend decides which
 * are taken on right now (homegennyserver/src/common/config/active-series.ts),
 * so forms read it from there instead of keeping their own list.
 *
 * `value` is the DB enum every API takes (SKILLED_CARE…), `short` is what the
 * screen shows (SC…). Never send `short` where `value` is expected.
 */
export interface SeriesOption {
  value: 'UNSKILLED_CARE' | 'SKILLED_CARE' | 'COOK' | 'MAID' | 'DRIVER';
  short: string;
  label: string;
  active: boolean;
}

/** Used until /meta/series answers, and if it can't. Mirrors the backend. */
export const FALLBACK_SERIES: SeriesOption[] = [
  { value: 'UNSKILLED_CARE', short: 'UC', label: 'Unskilled Caretaker', active: true },
  { value: 'SKILLED_CARE', short: 'SC', label: 'Skilled Caretaker', active: true },
  { value: 'COOK', short: 'CK', label: 'Cook', active: true },
  { value: 'MAID', short: 'MAID', label: 'Maid', active: false },
  { value: 'DRIVER', short: 'DR', label: 'Driver', active: false },
];

export function useSeriesCatalog() {
  const q = useQuery({
    queryKey: ['meta-series'],
    queryFn: () => api.getSeriesMeta(),
    staleTime: 10 * 60_000,
  });
  const data = q.data as { series?: SeriesOption[]; stage_2_5_enabled?: boolean } | undefined;
  const all = data?.series?.length ? data.series : FALLBACK_SERIES;
  return {
    /** Every series, for filters and lists — paused ones still have staff. */
    all,
    /** Only what a NEW staff member may be created as. */
    active: all.filter((s) => s.active),
    stage25Enabled: data?.stage_2_5_enabled ?? false,
    isLoading: q.isLoading,
  };
}
