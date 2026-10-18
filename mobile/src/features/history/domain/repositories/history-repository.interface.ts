import { TransactionItem } from '../entities/transaction';

export interface IHistoryRepository {
  getTransactions(accountId?: string): Promise<TransactionItem[]>;
}

