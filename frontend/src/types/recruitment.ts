// Recruitment Tracker Types - matches FastAPI/MongoDB schema

export type JobStatus = 'Open' | 'On Hold' | 'Closed';

export type CandidateStatus =
  | 'Applied'
  | 'Available'
  | 'Submitted to Client'
  | 'Shortlisted'
  | 'Interview Scheduled'
  | 'Interviewed'
  | 'Approved'
  | 'Rejected'
  | 'Offer Released'
  | 'Onboarded';

export interface StatusHistoryEntry {
  status: string;
  changedAt: string;
}

export interface Job {
  id: string;
  jobId: string;
  jobTitle: string;
  clientName: string;
  jobDescription: string;
  positions: number;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusHistoryEntry[];
}

export interface Candidate {
  id: string;
  candidateId: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  jobId: string;
  currentStatus: CandidateStatus;
  availability: string;
  recruiter: string;
  currentCtc?: string;
  expectedCtc?: string;
  matchScore?: number;
  experience?: string;
  location?: string;
  rating?: number;
  vettingStatus?: string;
  statusHistory: StatusHistoryEntry[];
  interviewDate?: string;
  offerDate?: string;
  onboardingStatus: 'Yes' | 'No' | 'Pending';
  joiningDate?: string;
  createdAt: string;
  masked_resume_text?: string | null;
  masked_name?: string | null;
  socialLinks?: string[];
  lastCompany?: string | null;
}

export interface DashboardMetrics {
  openPositions: number;
  totalApplicants: number;
  shortlisted: number;
  interviewsScheduled: number;
  offersReleased: number;
  onboarded: number;
}

export interface FunnelMetrics {
  stage: string;
  count: number;
  percentage: number;
}

export interface TATMetrics {
  metric: string;
  avgDays: number;
  minDays: number;
  maxDays: number;
  count: number;
}

export interface RatioMetrics {
  name: string;
  value: number;
  total: number;
  ratio: number;
}
