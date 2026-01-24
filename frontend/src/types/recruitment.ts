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
  _id?: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  jobId: string;
  currentStatus: CandidateStatus;
  current_status?: CandidateStatus; // Backend snake_case
  availability: string;
  recruiter: string;
  currentCtc?: string;
  current_ctc?: string; // Backend snake_case
  expectedCtc?: string;
  expected_ctc?: string; // Backend snake_case
  matchScore?: number;
  match_score?: number; // Backend snake_case
  experience?: string;
  location?: string;
  rating?: number;
  vettingStatus?: string;
  statusHistory: StatusHistoryEntry[];
  status_history?: StatusHistoryEntry[]; // Backend snake_case
  interviewDate?: string;
  offerDate?: string;
  onboardingStatus: 'Yes' | 'No' | 'Pending';
  joiningDate?: string;
  createdAt: string;
  created_at?: string; // Backend snake_case
  masked_resume_text?: string | null;
  masked_name?: string | null;
  socialLinks?: string[];
  social_links?: string[]; // Backend snake_case
  lastCompany?: string | null;
  last_company?: string | null; // Backend snake_case
  candidate_id?: string | number; // Backend snake_case
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
