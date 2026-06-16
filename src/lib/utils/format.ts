import { format, formatDistanceToNow } from 'date-fns';

export const fDate = (d: string | Date | null | undefined) =>
  d ? format(new Date(d), 'dd MMM yyyy') : '—';

export const fDateTime = (d: string | Date | null | undefined) =>
  d ? format(new Date(d), 'dd MMM yyyy, hh:mm a') : '—';

export const fRelative = (d: string | Date) =>
  formatDistanceToNow(new Date(d), { addSuffix: true });

export const fToNow = fRelative;

export const fCurrency = (n: number | null | undefined) =>
  n != null ? `Rs.${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—';

export const fPhone = (p: string) => p.replace(/^(\+91)?(\d{5})(\d{5})$/, '+91 $2 $3');