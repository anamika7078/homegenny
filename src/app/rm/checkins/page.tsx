'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import { ExternalLink, Home, MapPin } from 'lucide-react';
import { api } from '@/lib/api/client';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

interface Point { at: string | null; lat: number | null; lng: number | null; distance_m: number | null; far: boolean | null }
interface Row {
  shift_id: string;
  status: string;
  staff: { id: string; name: string; code: string; series: string };
  client: { id: string; name: string; address: string | null } | null;
  placement_id: string | null;
  branch: string | null;
  home: { lat: number; lng: number; source: 'CLIENT' | 'STAFF_REQUEST' } | null;
  check_in: Point | null;
  check_out: Point | null;
}

const istToday = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const time = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—';
const dist = (m: number | null) => (m === null ? 'no home on file' : m < 1000 ? `${m} m from home` : `${(m / 1000).toFixed(1)} km from home`);
const gmaps = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
const isFar = (r: Row) => !!(r.check_in?.far || r.check_out?.far);

/**
 * Where staff checked in and out on a day, against the client's home. No live
 * tracking — these are the GPS points sent with check-in/check-out. More than
 * 300 m from the home is flagged red. Map: OpenStreetMap (no key, no cost).
 */
export default function CheckinsPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(istToday());
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['checkins', date], queryFn: () => api.getCheckins({ date }) });
  const items: Row[] = data?.items ?? [];

  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);

  const setHome = useMutation({
    mutationFn: (v: { clientId: string; lat: number; lng: number }) => api.setClientHomeLocation(v.clientId, { lat: v.lat, lng: v.lng }),
    onSuccess: () => { toast.success('Home location saved'); qc.invalidateQueries({ queryKey: ['checkins'] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Leaflet touches `window`, so it loads in the browser only.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapEl.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(mapEl.current, { zoomControl: true }).setView([28.6139, 77.209], 11);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapRef.current);
        layerRef.current = L.layerGroup().addTo(mapRef.current);
      }
      const layer = layerRef.current!;
      layer.clearLayers();
      const bounds: [number, number][] = [];
      for (const r of items) {
        if (r.home) {
          L.circleMarker([r.home.lat, r.home.lng], { radius: 6, color: '#64748b', fillColor: '#94a3b8', fillOpacity: 0.9, weight: 2 })
            .bindTooltip(`${r.client?.name ?? 'Client'} — home`)
            .addTo(layer);
          bounds.push([r.home.lat, r.home.lng]);
        }
        for (const [label, p] of [['In', r.check_in], ['Out', r.check_out]] as const) {
          if (!p || p.lat === null || p.lng === null) continue;
          const color = p.far ? '#e11d48' : p.far === false ? '#059669' : '#d97706';
          L.circleMarker([p.lat, p.lng], { radius: selected === r.shift_id ? 10 : 7, color, fillColor: color, fillOpacity: 0.85, weight: 2 })
            .bindTooltip(`${r.staff.name} · ${label} ${time(p.at)} · ${dist(p.distance_m)}`)
            .on('click', () => setSelected(r.shift_id))
            .addTo(layer);
          if (r.home && label === 'In') {
            L.polyline([[r.home.lat, r.home.lng], [p.lat, p.lng]], { color, weight: 1.5, dashArray: '4 4' }).addTo(layer);
          }
          bounds.push([p.lat, p.lng]);
        }
      }
      if (bounds.length) mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
    })();
    return () => { cancelled = true; };
  }, [items, selected]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  const s = data?.summary;
  return (
    <div className="page-padding max-w-6xl mx-auto space-y-4">
      <RmPageHeader
        title="Check-ins"
        description="Where staff checked in and out, against the client's home — more than 300 m away is red"
        actions={<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-44" />}
      />

      {s && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { l: 'Check-ins', v: s.total, c: 'text-foreground' },
            { l: 'With GPS', v: s.with_gps, c: 'text-foreground' },
            { l: 'Far from home', v: s.far, c: s.far ? 'text-rose-300' : 'text-emerald-300' },
            { l: 'Client home not set', v: s.no_home, c: s.no_home ? 'text-amber-300' : 'text-muted-foreground' },
          ].map((x) => (
            <div key={x.l} className="rounded-xl border border-white/10 bg-card/40 p-3">
              <p className={cn('text-2xl font-bold', x.c)}>{x.v}</p>
              <p className="text-xs text-muted-foreground">{x.l}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div ref={mapEl} className="h-[420px] w-full overflow-hidden rounded-xl border border-white/10 lg:h-[560px]" />
          <p className="mt-2 text-[11px] text-muted-foreground">
            <span className="mr-3">● <span className="text-emerald-400">at home</span></span>
            <span className="mr-3">● <span className="text-rose-400">over 300 m away</span></span>
            <span className="mr-3">● <span className="text-amber-400">home not set</span></span>
            <span>● <span className="text-slate-400">client home</span></span>
          </p>
        </div>

        <div className="space-y-2 lg:col-span-2 lg:max-h-[580px] lg:overflow-y-auto">
          {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && items.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No check-ins on {date}.</p>
          )}
          {[...items].sort((a, b) => Number(isFar(b)) - Number(isFar(a))).map((r) => {
            const pin = r.check_in?.lat !== null && r.check_in?.lat !== undefined ? r.check_in : null;
            return (
              <div
                key={r.shift_id}
                onClick={() => setSelected(r.shift_id)}
                className={cn(
                  'glass-card cursor-pointer rounded-lg p-3 text-sm',
                  selected === r.shift_id && 'border-white/30',
                  isFar(r) && 'border-rose-500/40',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{r.staff.name} <span className="font-mono text-xs font-normal text-muted-foreground">{r.staff.code}</span></p>
                    <p className="truncate text-xs text-muted-foreground">{r.client?.name ?? 'No client'}{r.branch ? ` · ${r.branch}` : ''}</p>
                  </div>
                  {isFar(r) && <span className="rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">Far</span>}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  {(['check_in', 'check_out'] as const).map((k) => {
                    const p = r[k];
                    return (
                      <div key={k}>
                        <p className="text-muted-foreground">{k === 'check_in' ? 'In' : 'Out'} {time(p?.at ?? null)}</p>
                        {p && p.lat !== null && p.lng !== null ? (
                          <a href={gmaps(p.lat, p.lng)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                             className={cn('inline-flex items-center gap-1', p.far ? 'text-rose-300' : p.far === false ? 'text-emerald-300' : 'text-amber-300')}>
                            <MapPin className="h-3 w-3" />{dist(p.distance_m)}<ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <p className="text-muted-foreground">{p?.at ? 'no GPS sent' : '—'}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {r.client && pin && pin.lat !== null && pin.lng !== null && (!r.home || pin.far) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 gap-1 text-xs"
                    disabled={setHome.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHome.mutate({ clientId: r.client!.id, lat: pin.lat!, lng: pin.lng! });
                    }}
                  >
                    <Home className="h-3 w-3" />{r.home ? 'This is the real home — use it' : 'Use this as the client home'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
