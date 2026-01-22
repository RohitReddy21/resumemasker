import api from './axios';
import type { Job, Candidate, DashboardMetrics, JobStatus, CandidateStatus } from '@/types/recruitment';

// Job API Services
export const jobService = {
  getAll: async (): Promise<Job[]> => {
    const response = await api.get('/jobs');
    return response.data;
  },

  getById: async (id: string): Promise<Job> => {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },

  create: async (job: Omit<Job, '_id' | 'jobId' | 'createdAt' | 'updatedAt' | 'statusHistory'>): Promise<Job> => {
    const response = await api.post('/jobs', job);
    return response.data;
  },

  updateStatus: async (id: string, status: JobStatus): Promise<Job> => {
    const response = await api.patch(`/jobs/${id}/status`, { status });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/jobs/${id}`);
  },
};

// Candidate API Services
export const candidateService = {
  getAll: async (jobId?: string): Promise<Candidate[]> => {
    const params = jobId ? { jobId } : {};
    const response = await api.get('/candidates', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Candidate> => {
    const response = await api.get(`/candidates/${id}`);
    return response.data;
  },

  create: async (candidate: Omit<Candidate, '_id' | 'candidateId' | 'createdAt' | 'statusHistory'>): Promise<Candidate> => {
    const response = await api.post('/candidates', candidate);
    return response.data;
  },

  updateStatus: async (id: string, status: CandidateStatus): Promise<Candidate> => {
    const response = await api.patch(`/candidates/${id}/status`, { status });
    return response.data;
  },

  update: async (id: string, updates: Partial<Candidate>): Promise<Candidate> => {
    try {
      console.log(`Updating candidate ${id} with:`, updates);
      const response = await api.patch(`/candidates/${id}`, updates);
      console.log('Update response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Update failed:', error);
      
      // Handle specific error cases
      if (error.response?.status === 404) {
        throw new Error(`Candidate not found: ${id}`);
      } else if (error.response?.status === 400) {
        throw new Error(`Invalid update data: ${error.response.data?.detail || 'Unknown error'}`);
      } else if (error.response?.status === 500) {
        throw new Error(`Server error: ${error.response.data?.detail || 'Internal server error'}`);
      } else {
        throw new Error(`Update failed: ${error.message || 'Unknown error'}`);
      }
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      console.log(`Deleting candidate ${id}`);
      const response = await api.delete(`/candidates/${id}`);
      console.log('Delete response:', response.data);
    } catch (error: any) {
      console.error('Delete failed:', error);
      
      // Handle specific error cases
      if (error.response?.status === 404) {
        throw new Error(`Candidate not found: ${id}`);
      } else if (error.response?.status === 500) {
        throw new Error(`Server error: ${error.response.data?.detail || 'Internal server error'}`);
      } else {
        throw new Error(`Delete failed: ${error.message || 'Unknown error'}`);
      }
    }
  },
};

// Metrics API Services
export const metricsService = {
  getDashboard: async (): Promise<DashboardMetrics> => {
    const response = await api.get('/metrics/dashboard');
    return response.data;
  },

  getJobMetrics: async (jobId: string) => {
    const response = await api.get(`/metrics/job/${jobId}`);
    return response.data;
  },

  getFunnelMetrics: async () => {
    const response = await api.get('/metrics/funnel');
    return response.data;
  },

  getTATMetrics: async () => {
    const response = await api.get('/metrics/tat');
    return response.data;
  },
};
