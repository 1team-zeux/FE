import { useQuery } from '@tanstack/vue-query';
import { z } from 'zod';
import { AlarmSchema } from '../types/incident.schema';
import { api } from '@/services/api';

// 알람 피드를 5초마다 폴링한다
export const useAlarmFeedQuery = () => {
  return useQuery({
    queryKey: ['incident', 'alarm-feed'],
    queryFn: async () => {
      const res = await api.get('/api/triage/alarms');
      const alarms = res.data?.alarms ?? [];
      return z.array(AlarmSchema).parse(alarms);
    },
    refetchInterval: 5_000,
  });
};
