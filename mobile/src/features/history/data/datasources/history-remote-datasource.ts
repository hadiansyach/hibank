import { apiClient } from '@/core/network/api-client';
import { MutationItemDto, MutationsResponseDto, TransactionItemDto } from '../models/history.dto';

export interface IHistoryRemoteDataSource {
  getTransactions(accountId?: string): Promise<TransactionItemDto[]>;
  getAccountMutations(accountId: string, cursor?: string, limit?: number): Promise<MutationsResponseDto>;
}

export class HistoryRemoteDataSourceImpl implements IHistoryRemoteDataSource {
  async getAccountMutations(accountId: string, cursor?: string, limit: number = 20): Promise<MutationsResponseDto> {
    const params: Record<string, string | number> = { limit };
    if (cursor) {
      params.cursor = cursor;
    }
    const response = await apiClient.get<MutationsResponseDto>(`/v1/accounts/${accountId}/mutations`, {
      params,
    });
    return response.data;
  }

  async getTransactions(accountId?: string): Promise<TransactionItemDto[]> {
    let targetAccountId = accountId;

    if (!targetAccountId) {
      // Fetch user's primary account ID
      const accountsRes = await apiClient.get<Array<{ id: string }>>('/v1/accounts');
      if (accountsRes.data && accountsRes.data.length > 0) {
        targetAccountId = accountsRes.data[0].id;
      }
    }

    if (targetAccountId) {
      const mutationsRes = await this.getAccountMutations(targetAccountId, undefined, 50);
      if (mutationsRes.items && mutationsRes.items.length > 0) {
        return mutationsRes.items.map(this.mapMutationToTransaction);
      }
    }

    // If no mutations yet or no account, return empty list
    return [];
  }

  private mapMutationToTransaction(item: MutationItemDto): TransactionItemDto {
    const isCredit = item.direction === 'CR';
    const isTopup = item.transaction_type === 'TOPUP';

    let type: 'TOPUP' | 'TRANSFER_IN' | 'TRANSFER_OUT' = 'TRANSFER_OUT';
    let title = item.notes || 'Transaksi Perbankan';

    if (isTopup) {
      type = 'TOPUP';
      title = item.notes || 'Top Up Saldo';
    } else if (isCredit) {
      type = 'TRANSFER_IN';
      title = item.notes || 'Transfer Masuk';
    } else {
      type = 'TRANSFER_OUT';
      title = item.notes || 'Transfer Keluar';
    }

    return {
      id: item.id,
      type,
      title,
      subtitle: `Ref: ${item.reference_number}`,
      amount: item.amount,
      status: (item.status as 'SUCCESS' | 'PENDING' | 'FAILED') || 'SUCCESS',
      created_at: item.created_at,
      reference_number: item.reference_number,
      direction: item.direction as 'DB' | 'CR',
      balanceAfter: item.balance_after,
    };
  }
}

