import { AuthRemoteDataSourceImpl } from '../data/datasources/auth-remote-datasource';
import { AuthRepositoryImpl } from '../data/repositories/auth-repository.impl';
import { LoginUseCase } from '../domain/usecases/login.usecase';
import { RegisterUseCase } from '../domain/usecases/register.usecase';
import { LogoutUseCase } from '../domain/usecases/logout.usecase';

const authRemoteDataSource = new AuthRemoteDataSourceImpl();
export const authRepository = new AuthRepositoryImpl(authRemoteDataSource);

export const loginUseCase = new LoginUseCase(authRepository);
export const registerUseCase = new RegisterUseCase(authRepository);
export const logoutUseCase = new LogoutUseCase(authRepository);

