import { Account } from '../entities/account';

export interface IAccountRepository {
  getAccounts(): Promise<Account[]>;
  getAccountById(accountId: string): Promise<Account>;
  createAccount(accountType?: string): Promise<Account>;
}

