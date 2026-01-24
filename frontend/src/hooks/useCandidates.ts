import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidateService } from '@/api/services';

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

export type OnboardingStatus = 'Yes' | 'No' | 'Pending';

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  skills: string[];
  job_id: string;
  current_status: CandidateStatus;
  availability: string | null;
  recruiter: string | null;
  current_ctc: string | null;
  expected_ctc: string | null;
  match_score: number | null;
  experience: string | null;
  location: string | null;
  rating: number | null;
  vetting_status: string | null;
  status_history: Array<{ status: string; changedAt: string }>;
  interview_date: string | null;
  offer_date: string | null;
  onboarding_status: OnboardingStatus;
  joining_date: string | null;
  created_at: string;
  social_links?: string[];
  last_company?: string | null;
  masked_resume_text?: string | null;
  masked_name?: string | null;
}

export interface CreateCandidateInput {
  name: string;
  email: string;
  phone?: string;
  skills?: string[];
  job_id: string;
  current_status?: CandidateStatus;
  availability?: string;
  recruiter?: string;
  current_ctc?: string;
  expected_ctc?: string;
  match_score?: number;
  experience?: string;
  location?: string;
  rating?: number;
  vetting_status?: string;
  social_links?: string[];
  last_company?: string;
  masked_resume_text?: string;
  masked_name?: string;
}

export const useCandidate = (candidateId?: string) => {
  return useQuery({
    queryKey: ['candidate', candidateId],
    queryFn: async () => {
      if (!candidateId) return null;
      const data = await candidateService.getById(candidateId);
      // Convert the API response to match the Candidate interface
      return {
        id: data.id || (data as any)._id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        skills: data.skills || [],
        job_id: data.jobId || (data as any).job_id || '',
        current_status: data.currentStatus || (data as any).current_status || 'Applied',
        availability: data.availability || null,
        recruiter: data.recruiter || null,
        current_ctc: data.currentCtc || (data as any).current_ctc || null,
        expected_ctc: data.expectedCtc || (data as any).expected_ctc || null,
        match_score: data.matchScore || (data as any).match_score || 0,
        experience: data.experience || null,
        location: data.location || null,
        rating: data.rating || 0,
        vetting_status: data.vettingStatus || (data as any).vetting_status || 'Applied',
        status_history: (data as any).statusHistory || [],
        interview_date: (data as any).interviewDate || null,
        offer_date: (data as any).offerDate || null,
        onboarding_status: (data as any).onboardingStatus || 'No',
        joining_date: (data as any).joiningDate || null,
        created_at: data.createdAt || (data as any).created_at || new Date().toISOString(),
        social_links: data.socialLinks || (data as any).social_links || [],
        last_company: data.lastCompany || (data as any).last_company || null,
        masked_resume_text: data.masked_resume_text || null,
        masked_name: data.masked_name || null,
      } as Candidate;
    },
    enabled: !!candidateId,
    retry: 1,
  });
};

export const useCandidates = (jobId?: string) => {
  return useQuery({
    queryKey: ['candidates', jobId],
    queryFn: async () => {
      console.log('Fetching fresh candidates data...');
      const data = await candidateService.getAll(jobId);
      console.log(`Received ${data.length} candidates from backend`);
      
      // Map backend response (snake_case) to frontend interface (camelCase)
      return data.map((c: any) => ({
        ...c,
        // Backend returns 'id' as the primary identifier (UUID or ObjectId string)
        id: c.id || c._id,
        // Ensure all snake_case fields are available
        job_id: c.job_id || c.jobId,
        current_status: c.current_status || c.currentStatus || 'Applied',
        current_ctc: c.current_ctc || c.currentCtc,
        expected_ctc: c.expected_ctc || c.expectedCtc,
        match_score: c.match_score || c.matchScore || 0,
        status_history: c.status_history || c.statusHistory || [],
        created_at: c.created_at || c.createdAt,
        social_links: c.social_links || c.socialLinks || [],
        last_company: c.last_company || c.lastCompany,
        masked_resume_text: c.masked_resume_text,
        masked_name: c.masked_name,
      })) as Candidate[];
    },
    // Don't disable caching - let React Query handle it
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export const useCreateCandidate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCandidateInput) => {
      // Backend will generate and return the correct UUID
      const result = await candidateService.create(input as any);
      
      // Ensure we return the candidate with the correct ID from backend
      return {
        ...result,
        // Use the ID returned by backend (app-generated UUID)
        id: result.id
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
};

export const useUpdateCandidate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Candidate> }) => {
      // Validate inputs
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid candidate ID');
      }
      if (!updates || Object.keys(updates).length === 0) {
        throw new Error('No updates provided');
      }
      
      console.log(`Updating candidate ${id} with:`, updates);
      return await candidateService.update(id, updates);
    },
    onSuccess: (data, variables) => {
      console.log('Update successful:', data);
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
    onError: (error: any, variables) => {
      console.error('Update mutation failed:', error);
      console.error('Variables:', variables);
      
      // Don't continue to delete if update failed
      // Just let the error bubble up to the UI
    },
  });
};

export const useDeleteCandidate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Validate input
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid candidate ID');
      }
      
      console.log(`Deleting candidate ${id}`);
      return await candidateService.delete(id);
    },
    onSuccess: (_, id) => {
      console.log(`Successfully deleted candidate ${id}`);
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
    onError: (error: any, id) => {
      console.error(`Delete mutation failed for ${id}:`, error);
    },
  });
};
