import { useQuery } from '@tanstack/vue-query';
import { RootCauseDataSchema } from '../types/root-cause.schema';
import { rootCauseMockData } from '@/services/mocks/data';
export const useRootCauseQuery = (alarmId: string) => {
  return useQuery({
    queryKey: ['root-cause', alarmId],
    queryFn: async () => {
      const data = rootCauseMockData[alarmId as keyof typeof rootCauseMockData];
      if (!data) throw new Error('Root cause data not found');
      return RootCauseDataSchema.parse(data);
    },
  });
};
