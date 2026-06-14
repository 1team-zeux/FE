import { useQuery } from '@tanstack/vue-query';
import { RootCauseDataSchema } from '../types/root-cause.schema';
import { api } from '@/services/api';

export const useRootCauseQuery = (alarmId: string) => {
  return useQuery({
    queryKey: ['root-cause', alarmId],
    queryFn: async () => {
      const res = await api.get(`/root-cause/${alarmId}`);
      if (!res.data) throw new Error('Root cause data not found');
      return RootCauseDataSchema.parse(res.data);
    },
  });
};
