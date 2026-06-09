import { useQuery } from '@tanstack/vue-query';
import { EventSchema } from '../types/event.schema';
import { z } from 'zod';
import { eventsMockData } from '@/services/mocks/data';

export const useEventsQuery = (filters?: { severity?: string; customerId?: string }) => {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: async () => {
      let data = eventsMockData as unknown[];
      if (filters?.severity) data = data.filter((e: any) => e.severity === filters.severity);
      if (filters?.customerId) data = data.filter((e: any) => e.customerId === filters.customerId);
      return z.array(EventSchema).parse(data);
    },
    refetchInterval: 30000,
  });
};
