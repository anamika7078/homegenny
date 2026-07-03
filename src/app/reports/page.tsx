'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';
import { Download, Filter, TrendingUp, Users, Target, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

// Mock Data
const CONVERSION_FUNNEL = [
  { name: 'S1 Intake', value: 120 },
  { name: 'S2 Verification', value: 95 },
  { name: 'S3 Training', value: 80 },
  { name: 'S4 Agreements', value: 65 },
  { name: 'S5 Deployed', value: 50 },
];

const SERIES_DISTRIBUTION = [
  { name: 'Driver (DR)', value: 45, color: '#38BDF8' },
  { name: 'Skilled Care (SC)', value: 30, color: '#00C9A7' },
  { name: 'Unskilled Care (UC)', value: 25, color: '#8B5CF6' },
  { name: 'Maid (MAID)', value: 20, color: '#F0A500' },
];

const MONTHLY_PERFORMANCE = [
  { month: 'Jan', revenue: 4000, target: 3500 },
  { month: 'Feb', revenue: 4500, target: 4000 },
  { month: 'Mar', revenue: 4200, target: 4500 },
  { month: 'Apr', revenue: 5800, target: 5000 },
  { month: 'May', revenue: 6500, target: 5500 },
  { month: 'Jun', revenue: 7100, target: 6000 },
];

const TRIAL_SUCCESS = [
  { name: 'Confirmed', value: 78, color: '#10B981' },
  { name: 'Extended', value: 12, color: '#F59E0B' },
  { name: 'Exited', value: 10, color: '#EF4444' },
];

export default function ReportsPage() {
  return (
    <AppShell>
      <div className="page-padding mx-auto max-w-[1600px] space-y-6 sm:space-y-8 min-h-0 bg-[#0B0F17]">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-syne font-bold tracking-tight text-white flex items-center gap-2">
              Reports & Analytics
            </h1>
            <p className="text-secondary-foreground text-sm mt-1">
              Real-time enterprise metrics, pipeline conversions, and operational performance.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border text-secondary-foreground rounded-xl text-xs font-bold hover:bg-white/5 transition-all">
                <Filter className="w-4 h-4" />
                Filter by Branch
             </button>
             <button className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-xl shadow-primary/20 hover:bg-accent transition-all">
                <Download className="w-4 h-4" />
                Export PDF
             </button>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Conversion Rate', value: '41.6%', icon: Target, trend: '+2.4%', color: 'text-primary' },
            { label: 'Avg Trial Success', value: '78%', icon: Activity, trend: '+5.1%', color: 'text-emerald-400' },
            { label: 'Active Placements', value: '245', icon: Users, trend: '+12', color: 'text-violet-400' },
            { label: 'Monthly Revenue', value: '₹14.2L', icon: TrendingUp, trend: '+18%', color: 'text-sky-400' },
          ].map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={i}
            >
              <Card className="bg-[#121620]/50 border-white/5 shadow-xl hover:border-white/10 transition-colors">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-secondary-foreground mb-1">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center bg-white/5", stat.color)}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{stat.trend}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Revenue Area Chart */}
          <Card className="bg-[#121620]/50 border-white/5 shadow-xl">
            <CardHeader>
              <CardTitle className="text-base font-syne text-white">Financial Performance vs Target</CardTitle>
              <CardDescription>Monthly recurring revenue compared to targets.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MONTHLY_PERFORMANCE} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF5A1F" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FF5A1F" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1F2B', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }} />
                  <Area type="monotone" dataKey="revenue" name="Actual Revenue" stroke="#FF5A1F" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Line type="monotone" dataKey="target" name="Target Revenue" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Funnel Bar Chart */}
          <Card className="bg-[#121620]/50 border-white/5 shadow-xl">
            <CardHeader>
              <CardTitle className="text-base font-syne text-white">Pipeline Conversion Funnel</CardTitle>
              <CardDescription>Applicant drop-off rates across stages.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={CONVERSION_FUNNEL} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.7)" fontSize={11} tickLine={false} axisLine={false} width={100} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{ backgroundColor: '#1A1F2B', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" name="Applicants" fill="#38BDF8" radius={[0, 4, 4, 0]}>
                    {CONVERSION_FUNNEL.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === CONVERSION_FUNNEL.length - 1 ? '#10B981' : '#38BDF8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Series Distribution Pie */}
          <Card className="bg-[#121620]/50 border-white/5 shadow-xl">
            <CardHeader>
              <CardTitle className="text-base font-syne text-white">Staff Series Distribution</CardTitle>
              <CardDescription>Active deployed staff breakdown by series.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={SERIES_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {SERIES_DISTRIBUTION.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1F2B', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', border: 'none' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Trial Success Rate Pie */}
          <Card className="bg-[#121620]/50 border-white/5 shadow-xl">
            <CardHeader>
              <CardTitle className="text-base font-syne text-white">Trial Success Rate</CardTitle>
              <CardDescription>Outcome of the 7-14 day trial periods.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={TRIAL_SUCCESS}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    stroke="none"
                  >
                    {TRIAL_SUCCESS.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1F2B', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', border: 'none' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
