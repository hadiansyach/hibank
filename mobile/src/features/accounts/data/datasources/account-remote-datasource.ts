import { apiClient } from '@/core/network/api-client';
import { AccountDto } from '../models/account.dto';

export interface IAccountRemoteDataSource {
  getAccounts(): Promise<AccountDto[]>;
  getAccountById(accountId: string): Promise<AccountDto>;
  createAccount(accountType?: string): Promise<AccountDto>;
}

export class AccountRemoteDataSourceImpl implements IAccountRemoteDataSource {
  async getAccounts(): Promise<AccountDto[]> {
    const response = await apiClient.get<AccountDto[]>('/v1/accounts');
    return response.data;
  }

  async getAccountById(accountId: string): Promise<AccountDto> {
    const response = await apiClient.get<AccountDto>(`/v1/accounts/${accountId}`);
    return response.data;
  }

  async createAccount(accountType: string = 'SAVINGS'): Promise<AccountDto> {
    const response = await apiClient.post<AccountDto>('/v1/accounts', {
      account_type: accountType,
    });
    return response.data;
  }
}

