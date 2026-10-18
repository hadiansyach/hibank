import { IAccountRepository } from '../repositories/account-repository.interface';
import { Account } from '../entities/account';

export class GetAccountsUseCase {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(): Promise<Account[]> {
    return await this.accountRepository.getAccounts();
  }
}

