import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAccountUseCase, getAccountsUseCase, getAccountByIdUseCase } from '../../di/account-factory';
import { Account } from '../../domain/entities/account';

export const ACCOUNTS_QUERY_KEY = ['accounts'];

export const useAccounts = () => {
  return useQuery<Account[]>({
    queryKey: ACCOUNTS_QUERY_KEY,
    queryFn: async () => {
      return await getAccountsUseCase.execute();
    },
    staleTime: 30 * 1000, // 30 seconds fresh
    refetchOnWindowFocus: true,
  });
};

export const useAccountDetail = (accountId?: string | null) => {
  return useQuery<Account>({
    queryKey: ['account', accountId],
    queryFn: async () => {
      if (!accountId) throw new Error('Account ID is required');
      return await getAccountByIdUseCase.execute(accountId);
    },
    enabled: !!accountId,
    staleTime: 30 * 1000,
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountType: string = 'SAVINGS') => {
      return await createAccountUseCase.execute(accountType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
    },
  });
};

