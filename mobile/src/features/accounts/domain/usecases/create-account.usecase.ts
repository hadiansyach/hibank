import { Account } from '../entities/account';
import { IAccountRepository } from '../repositories/account-repository.interface';

export class CreateAccountUseCase {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(accountType: string = 'SAVINGS'): Promise<Account> {
    return await this.accountRepository.createAccount(accountType);
  }
}

