import type { JobStatus, CandidateStatus } from '@/types/recruitment';

export const JOB_STATUSES: JobStatus[] = ['Open', 'On Hold', 'Closed'];

export const CANDIDATE_STATUSES: CandidateStatus[] = [
  'Applied',
  'Available',
  'Submitted to Client',
  'Shortlisted',
  'Interview Scheduled',
  'Interviewed',
  'Approved',
  'Rejected',
  'Offer Released',
  'Onboarded',
];

export const STATUS_COLORS: Record<string, string> = {
  // Job statuses
  'Open': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'On Hold': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Closed': 'bg-muted text-muted-foreground border-border',
  
  // Candidate statuses
  'Applied': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Available': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  'Submitted to Client': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'Shortlisted': 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  'Interview Scheduled': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Interviewed': 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20',
  'Approved': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'Rejected': 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  'Offer Released': 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  'Onboarded': 'bg-green-500/10 text-green-600 border-green-500/20',
};

export const FUNNEL_STAGES = [
  { key: 'Applied', label: 'Applied' },
  { key: 'Submitted to Client', label: 'Submitted' },
  { key: 'Shortlisted', label: 'Shortlisted' },
  { key: 'Interviewed', label: 'Interviewed' },
  { key: 'Offer Released', label: 'Offered' },
  { key: 'Onboarded', label: 'Onboarded' },
];
