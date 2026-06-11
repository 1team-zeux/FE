import { useQuery } from '@tanstack/vue-query';
import { EventSchema } from '../types/event.schema';
import { z } from 'zod';
import { api } from '@/services/api';

export const useEventsQuery = (filters?: { severity?: string; customerId?: string }) => {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: async () => {
      const res = await api.get('/monitoring/api/v1/events');
      let data: any[] = res.data ?? [];
      if (filters?.severity) data = data.filter((e) => e.severity === filters.severity);
      if (filters?.customerId) data = data.filter((e) => e.customerId === filters.customerId);
      return z.array(EventSchema).parse(data);
    },
    refetchInterval: 30_000,
  });
};
