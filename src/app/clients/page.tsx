'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  Briefcase, 
  Clock, 
  MapPin, 
  TrendingUp, 
  MessageSquare,
  Building2,
  FileText,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

const CLIENTS_MOCK = [
  { id: 'CL-505', name: 'Dr. Aditi Sharma', company: 'Self', type: 'PREMIUM', location: 'Noida Sec 15', activePlacements: 2, status: 'ACTIVE' },
  { id: 'CL-508', name: 'Rajesh Khanna', company: 'KH Real Estate', type: 'CORPORATE', location: 'Gurgaon Ph 3', activePlacements: 5, status: 'ACTIVE' },
  { id: 'CL-512', name: 'Vikram Mehta', company: 'Self', type: 'STANDARD', location: 'Delhi GK-2', activePlacements: 1, status: 'PENDING' },
];

export default function ClientsPage() {
  return (
    <AppShell>
      <div className="page-padding mx-auto max-w-[1600px] space-y-6 sm:space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-syne font-bold text-gradient tracking-tight">Client Relationship Management</h1>
            <p className="text-secondary-foreground text-sm mt-1">
              Centralized hub for client lead tracking and service delivery.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-xl shadow-primary/20 hover:bg-accent transition-all">
                <UserPlus className="w-4 h-4" />
                Add New Client
             </button>
          </div>
        </div>

        {/* Client KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           {[
             { label: 'Active Clients', value: '142', icon: Users, color: 'text-primary' },
             { label: 'Total Placements', value: '428', icon: Briefcase, color: 'text-violet' },
             { label: 'Lead Conversion', value: '68%', icon: TrendingUp, color: 'text-success' },
             { label: 'Avg Rating', value: '4.8', icon: Star, color: 'text-warning' },
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
           {/* Client List */}
           <div className="xl:col-span-2 space-y-4">
              <div className="relative mb-6">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground" />
                 <input 
                   type="text" 
                   placeholder="Search by client name, ID or location..." 
                   className="w-full bg-secondary/30 border border-border rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                 />
              </div>

              <div className="space-y-4">
                 {CLIENTS_MOCK.map((client, idx) => (
                   <motion.div
                     key={client.id}
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: idx * 0.1 }}
                     className="glass-card p-5 rounded-2xl hover:bg-white/5 transition-all group"
                   >
                      <div className="flex items-start gap-4">
                         <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center text-primary font-bold text-xs shrink-0 group-hover:scale-110 transition-transform">
                            {client.name.split(' ').map(n => n[0]).join('')}
                         </div>
                         <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                               <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] font-bold text-primary">{client.id}</span>
                                  <Badge className={cn(
                                    "text-[9px] uppercase tracking-tighter",
                                    client.type === 'PREMIUM' ? "bg-violet text-white" : "bg-secondary text-secondary-foreground"
                                  )}>
                                    {client.type}
                                  </Badge>
                               </div>
                               <Badge className={cn(
                                 "text-[9px] uppercase tracking-tighter",
                                 client.status === 'ACTIVE' ? "bg-success text-white" : "bg-warning text-white"
                               )}>
                                 {client.status}
                               </Badge>
                            </div>
                            <h3 className="text-base font-bold font-syne group-hover:text-primary transition-colors">{client.name}</h3>
                            <div className="flex items-center gap-4 mt-2">
                               <div className="flex items-center gap-1.5 text-[10px] text-secondary-foreground">
                                  <MapPin className="w-3 h-3" />
                                  {client.location}
                               </div>
                               <div className="flex items-center gap-1.5 text-[10px] text-secondary-foreground">
                                  <Briefcase className="w-3 h-3" />
                                  {client.activePlacements} Active Staff
                               </div>
                            </div>
                         </div>
                         <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <MoreVertical className="w-4 h-4 text-secondary-foreground" />
                         </button>
                      </div>
                   </motion.div>
                 ))}
              </div>
           </div>

           {/* Client Insights Side Panel */}
           <div className="space-y-6">
              <Card>
                 <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest interactions and service logs.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-6">
                    <div className="space-y-4">
                       {[
                         { msg: 'New Placement: Driver (DR-421)', time: '2 hours ago', icon: Briefcase, color: 'text-primary' },
                         { msg: 'Payment Success: ₹45,000', time: '1 day ago', icon: FileText, color: 'text-success' },
                         { msg: 'Service Feedback: 5 Star', time: '2 days ago', icon: MessageSquare, color: 'text-warning' },
                       ].map((item, i) => (
                         <div key={i} className="flex gap-3">
                            <div className={cn("w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0", item.color)}>
                               <item.icon className="w-4 h-4" />
                            </div>
                            <div>
                               <p className="text-xs font-bold">{item.msg}</p>
                               <p className="text-[10px] text-muted-foreground">{item.time}</p>
                            </div>
                         </div>
                       ))}
                    </div>

                    <div className="p-4 rounded-2xl bg-violet/5 border border-violet/20">
                       <div className="flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 text-violet" />
                          <h4 className="text-xs font-bold text-violet">Top Spending Client</h4>
                       </div>
                       <p className="text-[10px] text-violet/70">Apex Residential has generated ₹12.4L in the last 6 months. High priority support active.</p>
                    </div>

                    <button className="w-full py-3 bg-secondary border border-border text-xs font-bold rounded-xl hover:bg-white/5 transition-colors">
                       View All Leads & Funnel
                    </button>
                 </CardContent>
              </Card>

              <div className="p-6 rounded-3xl bg-secondary/50 border border-border relative overflow-hidden group">
                 <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Building2 className="w-32 h-32" />
                 </div>
                 <h3 className="font-syne font-bold text-lg relative z-10">Corporate Desk</h3>
                 <p className="text-secondary-foreground text-xs mt-1 relative z-10">Manage B2B contracts and bulk placements.</p>
                 <button className="mt-6 w-full py-2.5 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-accent transition-all relative z-10">
                    Switch to Corporate View
                 </button>
              </div>
           </div>
        </div>
      </div>
    </AppShell>
  );
}
