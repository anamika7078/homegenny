'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, Clock, CheckCircle2, XCircle, Plus, AlertTriangle } from 'lucide-react';

type PlacementStatus = 'trial_7' | 'trial_14' | 'confirmed' | 'rejected' | 'mutual_exit' | 'extended';
type Series = 'DR'|'SC'|'UC'|'M3X';

const STATUS_STYLE: Record<PlacementStatus,{cls:string;label:string}> = {
  trial_7:     {cls:'bg-sky-500/15 text-sky-400 border-sky-500/30',         label:'7-Day Trial'},
  trial_14:    {cls:'bg-amber-500/15 text-amber-400 border-amber-500/30',   label:'14-Day Trial'},
  confirmed:   {cls:'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label:'Confirmed'},
  rejected:    {cls:'bg-red-500/15 text-red-400 border-red-500/30',         label:'Rejected'},
  mutual_exit: {cls:'bg-slate-500/15 text-slate-400 border-slate-500/30',   label:'Mutual Exit'},
  extended:    {cls:'bg-violet-500/15 text-violet-400 border-violet-500/30',label:'Extended'},
};
const SERIES_CLR: Record<Series,string> = {
  DR:'bg-amber-500/10 border-amber-500/20 text-amber-400',
  SC:'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  UC:'bg-sky-500/10 border-sky-500/20 text-sky-400',
  M3X:'bg-violet-500/10 border-violet-500/20 text-violet-400',
};

interface Placement {
  id:string; staffCode:string; staffName:string; series:Series;
  clientName:string; clientArea:string; startDate:string; daysLeft:number;
  status:PlacementStatus; scenario:string; dlExpiry?:string; pvDue?:string;
}

const PLACEMENTS: Placement[] = [
  {id:'p1',staffCode:'SC-010',staffName:'Sunita Devi',   series:'SC', clientName:'Sharma Family',   clientArea:'Vasant Kunj', startDate:'15 May 2026',daysLeft:1, status:'trial_7',  scenario:'DR-16',pvDue:'Jun 2026'},
  {id:'p2',staffCode:'DR-003',staffName:'Mohan Singh',   series:'DR', clientName:'Kapoor Household',clientArea:'Gurgaon',     startDate:'10 May 2026',daysLeft:4, status:'trial_14', scenario:'DR-16',dlExpiry:'Aug 2026'},
  {id:'p3',staffCode:'UC-020',staffName:'Meena Kumari',  series:'UC', clientName:'Verma Residence', clientArea:'Noida',       startDate:'1 May 2026', daysLeft:0, status:'confirmed', scenario:'DR-17'},
  {id:'p4',staffCode:'M3X-031',staffName:'Geeta Devi',   series:'M3X',clientName:'Gupta Family',   clientArea:'Dwarka',      startDate:'5 May 2026', daysLeft:2, status:'extended',  scenario:'DR-16'},
  {id:'p5',staffCode:'UC-022',staffName:'Rekha Sharma',  series:'UC', clientName:'Mehta House',     clientArea:'Rohini',      startDate:'18 May 2026',daysLeft:0, status:'rejected',  scenario:'DR-18'},
];

function DaysLeftBadge({days, status}: {days:number; status:PlacementStatus}) {
  if (status==='confirmed'||status==='rejected'||status==='mutual_exit') return null;
  const urgent = days<=2;
  return (
    <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${urgent ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-sky-500/10 border-sky-500/20 text-sky-400'}`}>
      <Clock className="w-3 h-3"/>
      {days===0 ? 'Expires today' : `${days}d left`}
    </span>
  );
}

function PlacementCard({p}:{p:Placement}) {
  const [open,setOpen] = useState(false);
  const st = STATUS_STYLE[p.status];
  const hasAlert = p.dlExpiry || p.pvDue || p.daysLeft <= 2;

  return (
    <div className={`rounded-xl border overflow-hidden ${hasAlert && (p.status==='trial_7'||p.status==='trial_14') ? 'border-amber-500/30' : 'border-white/8'} bg-card/60`}>
      <button onClick={()=>setOpen(!open)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/3 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-[#FF5A1F]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{p.staffName}</span>
            <span className="text-[10px] font-mono text-muted-foreground">{p.staffCode}</span>
            <span className={`text-[9px] font-bold uppercase border rounded-full px-2 py-0.5 ${SERIES_CLR[p.series]}`}>{p.series}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
            <span>📍 {p.clientName}</span>
            <span>· {p.clientArea}</span>
            <span>· Since {p.startDate}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <DaysLeftBadge days={p.daysLeft} status={p.status}/>
          <span className={`text-[10px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open?'rotate-180':''}`}/>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.25}} className="overflow-hidden border-t border-white/6">
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white/3 border border-white/8">
                  <p className="text-muted-foreground">Scenario Code</p>
                  <p className="font-bold text-[#FF5A1F] font-mono mt-0.5">{p.scenario}</p>
                </div>
                {p.dlExpiry && (
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                    <p className="text-muted-foreground">DL Expiry</p>
                    <p className="font-bold text-amber-400 mt-0.5">{p.dlExpiry}</p>
                  </div>
                )}
                {p.pvDue && (
                  <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/15">
                    <p className="text-muted-foreground">PV Renewal Due</p>
                    <p className="font-bold text-violet-400 mt-0.5">{p.pvDue}</p>
                  </div>
                )}
              </div>

              {(p.status==='trial_7'||p.status==='trial_14'||p.status==='extended') && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Trial Outcome</p>
                  <div className="flex flex-wrap gap-2">
                    <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5"/>Confirm Placement
                    </button>
                    <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-400 hover:bg-violet-500/30 transition-colors">
                      <Clock className="w-3.5 h-3.5"/>Extend Trial
                    </button>
                    <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors">
                      <XCircle className="w-3.5 h-3.5"/>Reject / Mutual Exit
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PlacementsPage() {
  const stats = {
    confirmed: PLACEMENTS.filter(p=>p.status==='confirmed').length,
    trial: PLACEMENTS.filter(p=>p.status==='trial_7'||p.status==='trial_14'||p.status==='extended').length,
    expiring: PLACEMENTS.filter(p=>p.daysLeft<=2&&(p.status==='trial_7'||p.status==='trial_14')).length,
    total: PLACEMENTS.length,
  };

  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="page-padding max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Deployments & Placements</h1>
          <p className="text-sm text-muted-foreground mt-1">S5 · Trial management · Confirmation tracking</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5A1F] text-white text-sm font-bold hover:bg-[#e04d17] transition-colors">
          <Plus className="w-4 h-4"/>New Placement
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:'Confirmed',val:stats.confirmed,cls:'text-emerald-400'},
          {label:'On Trial',val:stats.trial,cls:'text-sky-400'},
          {label:'Expiring Soon',val:stats.expiring,cls:'text-red-400'},
          {label:'Total',val:stats.total,cls:'text-foreground'},
        ].map(s=>(
          <div key={s.label} className="p-4 rounded-xl border border-white/8 bg-card/40">
            <p className={`text-2xl font-bold ${s.cls}`}>{s.val}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {stats.expiring > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0"/>
          <p className="text-sm text-red-400 font-semibold">{stats.expiring} trial(s) expiring within 2 days — action required</p>
        </div>
      )}

      <div className="p-4 rounded-xl border border-white/8 bg-white/3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">FSM Trial Flow</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>🔵 S5 Start → 7-Day Trial</span>
          <span>🟡 Client extends → 14-Day Trial</span>
          <span>🟢 Trial OK → Confirmed (S5-Terminal)</span>
          <span>🔴 Client rejects → Reject/Mutual Exit</span>
        </div>
      </div>

      <div className="space-y-3">
        {PLACEMENTS.map(p=><PlacementCard key={p.id} p={p}/>)}
      </div>
    </motion.div>
  );
}
