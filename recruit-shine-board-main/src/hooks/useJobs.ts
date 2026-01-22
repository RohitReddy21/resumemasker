import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobService } from '@/api/services';

export type JobStatus = 'Open' | 'On Hold' | 'Closed';

export interface Job {
  id: string;
  job_title: string;
  client_name: string;
  job_description: string | null;
  positions: number;
  status: JobStatus;
  status_history: Array<{ status: string; changedAt: string }>;
  created_at: string;
  updated_at: string;
}

export interface CreateJobInput {
  job_title: string;
  client_name: string;
  job_description?: string;
  positions: number;
  status?: JobStatus;
}

export const useJobs = () => {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      // Logic for local fallback if backend is down removed to enforce backend usage
      const data = await jobService.getAll();
      return data.map((j: any) => ({
        ...j,
        id: j.id || j._id // Handle MongoDB naming
      })) as Job[];
    },
    retry: 1,
  });
};

export const useCreateJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateJobInput) => {
      return await jobService.create(input as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
};

export const useUpdateJobStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobStatus }) => {
      return await jobService.updateStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
};

export const useDeleteJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await jobService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
};
