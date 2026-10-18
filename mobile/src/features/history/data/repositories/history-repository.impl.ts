import { IHistoryRepository } from '../../domain/repositories/history-repository.interface';
import { TransactionItem } from '../../domain/entities/transaction';
import { IHistoryRemoteDataSource } from '../datasources/history-remote-datasource';

export class HistoryRepositoryImpl implements IHistoryRepository {
  constructor(private readonly remoteDataSource: IHistoryRemoteDataSource) {}

  async getTransactions(accountId?: string): Promise<TransactionItem[]> {
    const dtos = await this.remoteDataSource.getTransactions(accountId);
    return dtos.map((dto) => ({
      id: dto.id,
      type: dto.type,
      title: dto.title,
      subtitle: dto.subtitle,
      amount: dto.amount,
      status: dto.status,
      createdAt: dto.created_at,
      referenceNumber: dto.reference_number,
    }));
  }
}

