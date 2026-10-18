import { IHistoryRepository } from '../repositories/history-repository.interface';
import { TransactionItem } from '../entities/transaction';

export class GetHistoryUseCase {
  constructor(private readonly historyRepository: IHistoryRepository) {}

  async execute(accountId?: string): Promise<TransactionItem[]> {
    return await this.historyRepository.getTransactions(accountId);
  }
}

