import { cn } from '@/lib/utils/cn';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color = 'primary', 
  trend,
  description 
}: {
  label: string; 
  value: string | number; 
  icon: LucideIcon;
  color?: 'primary' | 'success' | 'warning' | 'info' | 'violet' | 'danger'; 
  trend?: { value: number; isUp: boolean };
  description?: string;
}) {
  const colorMap = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    success: 'text-success bg-success/10 border-success/20',
    warning: 'text-warning bg-warning/10 border-warning/20',
    info: 'text-info bg-info/10 border-info/20',
    violet: 'text-violet bg-violet/10 border-violet/20',
    danger: 'text-danger bg-danger/10 border-danger/20',
  };

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="glass-card rounded-2xl p-5 group transition-all duration-300 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-16 h-16" />
      </div>

      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          'w-10 h-10 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110',
          colorMap[color]
        )}>
          <Icon className="w-5 h-5" />
        </div>
        
        {trend && (
          <div className={cn(
            'flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border',
            trend.isUp ? 'text-success bg-success/10 border-success/20' : 'text-danger bg-danger/10 border-danger/20'
          )}>
            {trend.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend.value}%
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-medium text-secondary-foreground font-figtree">{label}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-syne text-foreground tracking-tight">{value}</span>
        </div>
        {description && (
          <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest font-bold">{description}</p>
        )}
      </div>
    </motion.div>
  );
}