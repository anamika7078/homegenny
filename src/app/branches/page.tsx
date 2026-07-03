'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  MapPin, 
  Users, 
  TrendingUp, 
  Search, 
  Filter, 
  MoreVertical, 
  Plus, 
  Target,
  BarChart3,
  Globe,
  Navigation,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

const BRANCHES_MOCK = [
  { id: 'BR-DEL-01', name: 'New Delhi HQ', region: 'North', staff: 1240, revenue: '₹4.2Cr', status: 'ACTIVE' },
  { id: 'BR-NOI-02', name: 'Noida Sector 62', region: 'North', staff: 850, revenue: '₹2.8Cr', status: 'ACTIVE' },
  { id: 'BR-GUR-03', name: 'Gurgaon DLF Ph 3', region: 'North', staff: 920, revenue: '₹3.1Cr', status: 'ACTIVE' },
  { id: 'BR-BLR-04', name: 'Bangalore HSR', region: 'South', staff: 450, revenue: '₹1.5Cr', status: 'EXPANDING' },
];

export default function BranchesPage() {
  return (
    <AppShell>
      <div className="page-padding mx-auto max-w-[1600px] space-y-6 sm:space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-syne font-bold text-gradient tracking-tight">Enterprise Branch Network</h1>
            <p className="text-secondary-foreground text-sm mt-1">
              Multi-branch operational tracking and regional performance analytics.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-xl shadow-primary/20 hover:bg-accent transition-all">
                <Plus className="w-4 h-4" />
                Add New Branch
             </button>
          </div>
        </div>

        {/* Network KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           {[
             { label: 'Active Branches', value: '42', icon: Globe, color: 'text-primary' },
             { label: 'Total Staff', value: '8,450', icon: Users, color: 'text-violet' },
             { label: 'Network Revenue', value: '₹14.2Cr', icon: TrendingUp, color: 'text-success' },
             { label: 'Service Efficiency', value: '94%', icon: Target, color: 'text-warning' },
           ].map((stat, i) => (
             <Card key={i} className="bg-secondary/20">
                <div className="flex items-center gap-4">
                   <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center", stat.color)}>
                      <stat.icon className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-secondary-foreground">{stat.label}</p>
                      <h3 className="text-xl font-bold font-syne">{stat.value}</h3>
                   </div>
                </div>
             </Card>
           ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
           {/* Branch Grid */}
           <div className="xl:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                 <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground" />
                    <input 
                      type="text" 
                      placeholder="Search branches by city or code..." 
                      className="w-full bg-secondary/30 border border-border rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                 </div>
                 <div className="flex items-center gap-2">
                    <button className="p-3 rounded-xl bg-secondary border border-border text-secondary-foreground">
                       <Filter className="w-4 h-4" />
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {BRANCHES_MOCK.map((branch, idx) => (
                   <motion.div
                     key={branch.id}
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: idx * 0.1 }}
                   >
                      <Card className="group hover:border-primary/30 transition-all">
                         <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-3">
                               <div className="w-12 h-12 rounded-2xl bg-secondary border border-border flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Building2 className="w-6 h-6 text-primary" />
                               </div>
                               <div>
                                  <h3 className="text-base font-bold font-syne">{branch.name}</h3>
                                  <div className="flex items-center gap-1.5 text-[10px] text-secondary-foreground font-bold uppercase tracking-widest">
                                     <MapPin className="w-3 h-3" />
                                     {branch.region} Region
                                  </div>
                               </div>
                            </div>
                            <Badge className={cn(
                              "text-[9px] uppercase tracking-tighter",
                              branch.status === 'ACTIVE' ? "bg-success text-white" : "bg-warning text-white"
                            )}>
                               {branch.status}
                            </Badge>
                         </div>

                         <div className="grid grid-cols-2 gap-4 py-4 border-y border-border/50">
                            <div>
                               <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Managed Staff</p>
                               <p className="text-lg font-bold">{branch.staff}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Annual Revenue</p>
                               <p className="text-lg font-bold">{branch.revenue}</p>
                            </div>
                         </div>

                         <div className="mt-6 flex items-center justify-between">
                            <div className="flex -space-x-2">
                               {[1, 2, 3].map(i => (
                                 <div key={i} className="w-7 h-7 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[8px] font-bold">BM</div>
                               ))}
                            </div>
                            <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                               View Branch Details
                               <ChevronRight className="w-3 h-3" />
                            </button>
                         </div>
                      </Card>
                   </motion.div>
                 ))}
              </div>
           </div>

           {/* Regional Performance Side Panel */}
           <div className="space-y-6">
              <Card>
                 <CardHeader>
                    <CardTitle>Regional Distribution</CardTitle>
                    <CardDescription>Network footprint across India.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-6">
                    {[
                      { region: 'North (Delhi/NCR)', percentage: 65, color: 'bg-primary' },
                      { region: 'South (BLR/HYD)', percentage: 15, color: 'bg-violet' },
                      { region: 'West (MUM/PUN)', percentage: 12, color: 'bg-success' },
                      { region: 'East (KOL)', percentage: 8, color: 'bg-warning' },
                    ].map((item) => (
                      <div key={item.region} className="space-y-2">
                         <div className="flex justify-between text-xs font-bold">
                            <span className="text-secondary-foreground">{item.region}</span>
                            <span>{item.percentage}%</span>
                         </div>
                         <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${item.percentage}%` }}
                              className={cn("h-full rounded-full", item.color)} 
                            />
                         </div>
                      </div>
                    ))}

                    <div className="p-4 rounded-2xl bg-secondary/30 border border-border mt-8">
                       <div className="flex items-center gap-2 mb-3">
                          <Navigation className="w-4 h-4 text-primary" />
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-secondary-foreground">Expansion Target</h4>
                       </div>
                       <p className="text-[10px] text-muted-foreground leading-relaxed">Phase 3 expansion into Pune and Hyderabad scheduled for Q3 2024. Recruiting 12 new Branch Managers.</p>
                    </div>
                 </CardContent>
              </Card>

              <div className="p-6 rounded-3xl bg-gradient-to-br from-violet to-primary text-white shadow-2xl relative overflow-hidden group">
                 <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-32 h-32" />
                 </div>
                 <h3 className="font-syne font-bold text-lg relative z-10">Network Analytics</h3>
                 <p className="text-white/70 text-xs mt-1 relative z-10">Generate comprehensive branch performance reports.</p>
                 <button className="mt-6 w-full py-2.5 bg-white text-primary rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition-all relative z-10">
                    Download Master Report
                 </button>
              </div>
           </div>
        </div>
      </div>
    </AppShell>
  );
}
