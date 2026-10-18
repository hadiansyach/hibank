import { AccountRemoteDataSourceImpl } from '../data/datasources/account-remote-datasource';
import { AccountRepositoryImpl } from '../data/repositories/account-repository.impl';
import { GetAccountsUseCase } from '../domain/usecases/get-accounts.usecase';
import { GetAccountByIdUseCase } from '../domain/usecases/get-account-by-id.usecase';
import { CreateAccountUseCase } from '../domain/usecases/create-account.usecase';

const accountRemoteDataSource = new AccountRemoteDataSourceImpl();
export const accountRepository = new AccountRepositoryImpl(accountRemoteDataSource);
export const getAccountsUseCase = new GetAccountsUseCase(accountRepository);
export const getAccountByIdUseCase = new GetAccountByIdUseCase(accountRepository);
export const createAccountUseCase = new CreateAccountUseCase(accountRepository);

