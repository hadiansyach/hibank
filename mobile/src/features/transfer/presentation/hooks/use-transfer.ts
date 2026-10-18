import { executeTransferUseCase, inquiryUseCase, getTransferReceiptUseCase } from '../../di/transfer-factory';
import { TransferRequest, TransferResult } from '../../domain/entities/transfer';
import { ACCOUNTS_QUERY_KEY } from '@/features/accounts/presentation/hooks/use-accounts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation<TransferResult, Error, TransferRequest>({
    mutationFn: async (request: TransferRequest) => {
      return await executeTransferUseCase.execute(request);
    },
    onSuccess: () => {
      // Invalidate accounts and history cache to immediately reflect updated balance and mutation
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
};

export const useInquiry = () => {
  return useMutation({
    mutationFn: async ({ sourceAccountId, targetAccountNumber }: { sourceAccountId: string; targetAccountNumber: string }) => {
      return await inquiryUseCase.execute(sourceAccountId, targetAccountNumber);
    },
  });
};

export const useTransferReceipt = (transactionId: string | null) => {
  return useQuery<TransferResult>({
    queryKey: ['transferReceipt', transactionId],
    queryFn: async () => {
      if (!transactionId) throw new Error('Transaction ID is required');
      return await getTransferReceiptUseCase.execute(transactionId);
    },
    enabled: !!transactionId,
    staleTime: 60 * 1000,
  });
};


