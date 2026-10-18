import { IAccountRepository } from '../../domain/repositories/account-repository.interface';
import { Account } from '../../domain/entities/account';
import { IAccountRemoteDataSource } from '../datasources/account-remote-datasource';

export class AccountRepositoryImpl implements IAccountRepository {
  constructor(private readonly remoteDataSource: IAccountRemoteDataSource) {}

  async getAccounts(): Promise<Account[]> {
    const dts = await this.remoteDataSource.getAccounts();
    return dts.map((dto) => ({
      id: dto.id,
      userId: dto.user_id,
      accountNumber: dto.account_number,
      accountType: dto.account_type,
      balance: dto.balance,
      status: (dto.status || 'ACTIVE').toUpperCase(),
      createdAt: dto.created_at,
      updatedAt: dto.updated_at,
    }));
  }

  async getAccountById(accountId: string): Promise<Account> {
    const dto = await this.remoteDataSource.getAccountById(accountId);
    return {
      id: dto.id,
      userId: dto.user_id,
      accountNumber: dto.account_number,
      accountType: dto.account_type,
      balance: dto.balance,
      status: (dto.status || 'ACTIVE').toUpperCase(),
      createdAt: dto.created_at,
      updatedAt: dto.updated_at,
    };
  }

  async createAccount(accountType: string = 'SAVINGS'): Promise<Account> {
    const dto = await this.remoteDataSource.createAccount(accountType);
    return {
      id: dto.id,
      userId: dto.user_id,
      accountNumber: dto.account_number,
      accountType: dto.account_type,
      balance: dto.balance,
      status: (dto.status || 'ACTIVE').toUpperCase(),
      createdAt: dto.created_at,
      updatedAt: dto.updated_at,
    };
  }
}

