import { IAccountRepository } from '../repositories/account-repository.interface';
import { Account } from '../entities/account';

export class GetAccountByIdUseCase {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(accountId: string): Promise<Account> {
    return await this.accountRepository.getAccountById(accountId);
  }
}
