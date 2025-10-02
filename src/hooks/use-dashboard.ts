import { useQuery } from '@tanstack/react-query';
import { api, DashboardOverviewResponse } from '@/lib/api';

export const useDashboardOverview = () =>
  useQuery<DashboardOverviewResponse>({
    queryKey: ['dashboard', 'overview'],
    queryFn: api.dashboard.overview,
    staleTime: 60_000,
  });
