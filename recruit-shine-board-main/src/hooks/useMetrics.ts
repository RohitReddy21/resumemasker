import { useQuery } from '@tanstack/react-query';
import { metricsService } from '@/api/services';
import type { DashboardMetrics, FunnelMetrics, TATMetrics } from '@/types/recruitment';

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['metrics', 'dashboard'],
    queryFn: async (): Promise<DashboardMetrics> => {
      return await metricsService.getDashboard();
    },
    retry: 1,
  });
};

export const useFunnelMetrics = () => {
  return useQuery({
    queryKey: ['metrics', 'funnel'],
    queryFn: async (): Promise<FunnelMetrics[]> => {
      return await metricsService.getFunnelMetrics();
    },
  });
};

export const useTATMetrics = () => {
  return useQuery({
    queryKey: ['metrics', 'tat'],
    queryFn: async (): Promise<TATMetrics[]> => {
      return await metricsService.getTATMetrics();
    },
  });
};
