'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api/client';
import { TableSkeleton } from '@/components/ui/loading';

interface Row {
  sl: number; code: string; rank: string; name: string; father_or_husband_name: string | null; sex: string | null;
  days: string[]; days_present: number; additional_hours: number; weekly_off: number; total: number; remarks: string;
}
interface Roll {
  month_label: string; days_in_month: number; unit_code: string | null;
  contractor: { name: string; address: string | null };
  principal_employer: { name: string; address: string | null };
  rows: Row[]; daily_mandays: number[];
  totals: { total_present: number; additional_hours: number; weekly_off: number; total_mandays: number };
  proof: Record<string, number>; disputed_days: number;
  signed: null | { id: string; version: number; status: string; sign_method: string; signed_at: string; signed_name: string | null; has_scan: boolean; note: string | null; locked: boolean };
  changed_since_signed: string[];
  versions: { id: string; version: number; status: string; sign_method: string; signed_at: string; signed_name: string | null }[];
}

const unwrap = <T,>(r: any): T => (r?.data ?? r) as T;
const field = 'rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-foreground';
const PROOF_LABEL: Record<string, string> = {
  PENDING: 'waiting on client', APPROVED: 'client approved', DEEMED: 'deemed (48 h)', DISPUTED: 'disputed', APPROVED_PAPER: 'signed on paper',
};

async function openBlob(blob: Blob, name: string, download = false) {
  const url = URL.createObjectURL(blob);
  if (download) {
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  } else {
    window.open(url, '_blank', 'noopener');
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * The client's Form XVI muster roll for a month — the same screen for RM, HR
 * and Finance. Built from attendance; shows whether the client has signed it
 * (in the app or on paper), what changed since, and lets the RM upload the
 * signed paper copy.
 */
export function MusterRollScreen({ canUpload }: { canUpload: boolean }) {
  const qc = useQueryClient();
  const now = new Date();
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [file, setFile] = useState<File | null>(null);
  const [signedName, setSignedName] = useState('');
  const [note, setNote] = useState('');

  const clients = useQuery({ queryKey: ['muster-clients', search], queryFn: () => api.getMusterRollClients(search || undefined) });
  const clientList = unwrap<any[]>(clients.data) ?? [];
  const roll = useQuery({
    queryKey: ['muster-roll', clientId, month, year],
    queryFn: () => api.getMusterRoll(clientId, month, year),
    enabled: !!clientId,
  });
  const r = roll.data ? unwrap<Roll>(roll.data) : null;

  const upload = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('file', file as File);
      fd.append('client_id', clientId); fd.append('month', String(month)); fd.append('year', String(year));
      if (signedName.trim()) fd.append('signed_name', signedName.trim());
      if (note.trim()) fd.append('note', note.trim());
      return api.uploadSignedMusterRoll(fd);
    },
    onSuccess: (res: any) => {
      const out = unwrap<{ version: number; days_confirmed: number }>(res);
      toast.success(`Signed roll saved (version ${out.version}) — ${out.days_confirmed} waiting day(s) confirmed.`);
      setFile(null); setSignedName(''); setNote('');
      qc.invalidateQueries({ queryKey: ['muster-roll', clientId, month, year] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const print = async (opts: { version?: number; audit?: boolean } = {}) => {
    try {
      await openBlob(await api.printMusterRoll(clientId, month, year, opts), `muster-roll-${year}-${month}.html`);
    } catch (e: any) { toast.error(e.message ?? 'Could not open the muster roll'); }
  };

  return (
    <div className="page-padding max-w-[1400px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Muster roll (Form XVI)</h1>
        <p className="text-sm text-muted-foreground">
          Built from attendance for a client and month. The client signs it in the app, or on paper — the RM uploads the signed copy.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="muster-search" className="mb-1 block text-xs text-muted-foreground">Client</label>
          <input id="muster-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or unit code" className={`${field} w-56`} />
        </div>
        <select aria-label="Client" value={clientId} onChange={(e) => setClientId(e.target.value)} className={`${field} min-w-[260px]`}>
          <option value="">Choose a client…</option>
          {clientList.map((c: any) => <option key={c.id} value={c.id}>{c.customer_name}{c.unit_code ? ` · ${c.unit_code}` : ''}</option>)}
        </select>
        <select aria-label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))} className={field}>
          {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i, 1).toLocaleString('en-IN', { month: 'long' })}</option>)}
        </select>
        <input aria-label="Year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${field} w-24`} />
      </div>

      {!clientId ? <p className="text-sm text-muted-foreground">Choose a client to see their muster roll.</p>
        : roll.isLoading ? <TableSkeleton rows={6} />
        : roll.error ? <p className="text-sm text-rose-400">{(roll.error as Error).message}</p>
        : r && (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 p-3 text-sm">
            <span className="font-semibold">{r.principal_employer.name} · {r.month_label}</span>
            {r.signed ? (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.changed_since_signed.length ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                {r.signed.sign_method === 'CLIENT_APP' ? `Signed in app by ${r.signed.signed_name}` : 'Signed on paper'} · v{r.signed.version}
                {r.changed_since_signed.length ? ' · changed since' : ''}
              </span>
            ) : <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-muted-foreground">Not signed yet</span>}
            <span className="text-xs text-muted-foreground">
              Staff-app days: {Object.entries(r.proof).map(([k, v]) => `${v} ${PROOF_LABEL[k] ?? k}`).join(' · ') || 'none'}
            </span>
            <div className="ml-auto flex gap-2">
              <button onClick={() => print()} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/5">Print / PDF</button>
              <button onClick={() => print({ audit: true })} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/5">With proof page</button>
              {r.signed?.has_scan && (
                <button
                  onClick={async () => openBlob(await api.downloadMusterRollScan(r.signed!.id), 'signed-muster-roll')}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/5"
                >Signed copy</button>
              )}
            </div>
          </div>

          {r.changed_since_signed.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <p className="font-semibold">Attendance changed after the client signed — they should sign again:</p>
              <p>{r.changed_since_signed.slice(0, 8).join(' · ')}{r.changed_since_signed.length > 8 ? ` … and ${r.changed_since_signed.length - 8} more` : ''}</p>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-[11px]">
              <thead className="bg-white/5 text-muted-foreground">
                <tr>
                  <th className="px-1.5 py-1 text-left">#</th><th className="px-1.5 text-left">Code</th><th className="px-1.5 text-left">Rank</th>
                  <th className="px-1.5 text-left">Name</th><th className="px-1.5 text-left">Father/Husband</th><th className="px-1.5">Sex</th>
                  {Array.from({ length: r.days_in_month }, (_, i) => <th key={i} className="w-5 px-0.5">{i + 1}</th>)}
                  <th className="px-1.5">Present</th><th className="px-1.5">Addl hrs</th><th className="px-1.5">W/O</th><th className="px-1.5">Total</th><th className="px-1.5 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {r.rows.map((row) => (
                  <tr key={row.sl} className="border-t border-white/5">
                    <td className="px-1.5 py-1">{row.sl}</td><td className="px-1.5 font-mono">{row.code}</td><td className="px-1.5">{row.rank}</td>
                    <td className="px-1.5">{row.name}</td>
                    <td className={`px-1.5 ${row.father_or_husband_name ? '' : 'text-amber-400'}`}>{row.father_or_husband_name ?? 'missing'}</td>
                    <td className={`px-1.5 text-center ${row.sex ? '' : 'text-amber-400'}`}>{row.sex ?? '?'}</td>
                    {row.days.map((d, i) => (
                      <td key={i} className={`px-0.5 text-center ${d === 'A' ? 'text-rose-400' : d === 'WO' ? 'text-muted-foreground' : ''}`}>{d}</td>
                    ))}
                    <td className="px-1.5 text-center font-semibold">{row.days_present}</td>
                    <td className="px-1.5 text-center">{row.additional_hours || ''}</td>
                    <td className="px-1.5 text-center">{row.weekly_off || ''}</td>
                    <td className="px-1.5 text-center font-semibold">{row.total}</td>
                    <td className="px-1.5 text-amber-300">{row.remarks}</td>
                  </tr>
                ))}
                <tr className="border-t border-white/10 bg-white/5 font-semibold">
                  <td colSpan={6} className="px-1.5 py-1">Daily mandays</td>
                  {r.daily_mandays.map((n, i) => <td key={i} className="px-0.5 text-center">{n || ''}</td>)}
                  <td className="px-1.5 text-center">{r.totals.total_present}</td><td className="px-1.5 text-center">{r.totals.additional_hours || ''}</td>
                  <td className="px-1.5 text-center">{r.totals.weekly_off || ''}</td><td className="px-1.5 text-center">{r.totals.total_mandays}</td><td />
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            P present · ½ half day · A absent · L leave · WO weekly off · blank: not recorded{r.disputed_days ? ` or under review (${r.disputed_days} disputed)` : ''}.
            “missing” father/husband name or sex: fill it on the staff member&apos;s page.
          </p>

          {canUpload && (
            <div className="space-y-2 rounded-xl border border-white/10 p-4">
              <p className="font-semibold text-sm">Upload the paper roll the client signed</p>
              <p className="text-xs text-muted-foreground">Print it, have the client sign and stamp it, then upload a photo or PDF. The month&apos;s days still waiting on the client are confirmed.</p>
              <div className="flex flex-wrap items-end gap-2">
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
                <input value={signedName} onChange={(e) => setSignedName(e.target.value)} placeholder="Signed by (name)" className={`${field} w-48`} />
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className={`${field} w-56`} />
                <button
                  disabled={!file || upload.isPending}
                  onClick={() => upload.mutate()}
                  className="rounded-lg bg-[#FF5A1F] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                >{upload.isPending ? 'Uploading…' : 'Upload signed roll'}</button>
              </div>
            </div>
          )}

          {r.versions.length > 0 && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Signed versions ({r.versions.length})</summary>
              <ul className="mt-1 space-y-1">
                {r.versions.map((v) => (
                  <li key={v.id}>
                    v{v.version} · {v.sign_method === 'CLIENT_APP' ? `app, ${v.signed_name}` : 'paper'} · {new Date(v.signed_at).toLocaleString('en-IN')} · {v.status.toLowerCase().replace('_', ' ')}
                    {' '}<button className="underline" onClick={() => print({ version: v.version })}>print</button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
