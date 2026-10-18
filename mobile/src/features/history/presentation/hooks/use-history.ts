import { useQuery } from '@tanstack/react-query';
import { getHistoryUseCase } from '../../di/history-factory';
import { TransactionItem } from '../../domain/entities/transaction';

export const HISTORY_QUERY_KEY = ['history'];

export const useHistory = (accountId?: string) => {
  return useQuery<TransactionItem[]>({
    queryKey: ['history', accountId || 'primary'],
    queryFn: async () => {
      return await getHistoryUseCase.execute(accountId);
    },
    staleTime: 15 * 1000,
  });
};

