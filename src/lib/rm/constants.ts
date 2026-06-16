import type { PipelineStage, Series } from '@/lib/types';

export const PIPELINE_STAGES: PipelineStage[] = [
  'S1_INTAKE',
  'S2_VERIFY',
  'S2_5_ASSESS',
  'S3_TRAIN',
  'S4_AGREEMENTS',
  'S5_DEPLOY',
  'DEFERRED',
  'TERMINAL',
];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  S1_INTAKE: 'S1 Intake',
  S2_VERIFY: 'S2 Verification',
  S2_5_ASSESS: 'S2.5 Assessment',
  S3_TRAIN: 'S3 Training',
  S4_AGREEMENTS: 'S4 Agreements',
  S5_DEPLOY: 'S5 Deployment',
  DEFERRED: 'Deferred',
  TERMINAL: 'Terminal',
};

export const STAGE_COLORS: Record<PipelineStage, string> = {
  S1_INTAKE: 'from-slate-600/80 to-slate-800/80',
  S2_VERIFY: 'from-blue-900/60 to-blue-950/80',
  S2_5_ASSESS: 'from-indigo-900/60 to-indigo-950/80',
  S3_TRAIN: 'from-violet-900/60 to-violet-950/80',
  S4_AGREEMENTS: 'from-amber-900/50 to-amber-950/80',
  S5_DEPLOY: 'from-emerald-900/60 to-emerald-950/80',
  DEFERRED: 'from-orange-900/60 to-orange-950/80',
  TERMINAL: 'from-rose-900/50 to-rose-950/80',
};

export const SERIES_LABELS: Record<string, string> = {
  MAID: 'M3X',
  SKILLED_CARE: 'SC',
  UNSKILLED_CARE: 'UC',
  DRIVER: 'DR',
  M3X: 'M3X',
  SC: 'SC',
  UC: 'UC',
  DR: 'DR',
};

export const SERIES_BADGE: Record<string, string> = {
  MAID: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  SKILLED_CARE: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  UNSKILLED_CARE: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  DRIVER: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
};

export const TRAINING_DAYS: Record<Series, number> = {
  MAID: 3,
  SC: 7,
  UC: 5,
  DR: 5,
};

export const TRIAL_DAYS: Record<Series, number> = {
  MAID: 7,
  SC: 14,
  UC: 7,
  DR: 7,
};

export const FSM_NEXT: Partial<Record<PipelineStage, PipelineStage[]>> = {
  S1_INTAKE: ['S2_VERIFY', 'TERMINAL'],
  S2_VERIFY: ['S2_5_ASSESS', 'S3_TRAIN', 'DEFERRED', 'TERMINAL'],
  S2_5_ASSESS: ['S3_TRAIN', 'DEFERRED', 'TERMINAL'],
  S3_TRAIN: ['S4_AGREEMENTS', 'DEFERRED', 'TERMINAL'],
  S4_AGREEMENTS: ['S5_DEPLOY', 'TERMINAL'],
  S5_DEPLOY: ['TERMINAL'],
  DEFERRED: ['S2_VERIFY', 'S3_TRAIN', 'TERMINAL'],
};
