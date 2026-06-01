import { useQuery } from '@tanstack/vue-query';
import { BUSchema } from '../types/portfolio.schema';
import { portfolioMockData } from '@/services/mocks/data';
export const usePortfolioQuery = () => {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return portfolioMockData.map((item) => BUSchema.parse(item));
    },
  });
};
