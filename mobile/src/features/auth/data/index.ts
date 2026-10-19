import { AuthRemoteDataSourceImpl } from './datasources/authRemoteDataSource';
import { AuthLocalDataSourceImpl } from './datasources/authLocalDataSource';
import { AuthRepositoryImpl } from './repositories/authRepositoryImpl';
import {
  LoginUseCase,
  RegisterUseCase,
  HashPinUseCase,
  LogoutUseCase,
} from '../domain/usecases';

export * from './models';
export * from './datasources/authRemoteDataSource';
export * from './datasources/authLocalDataSource';
export * from './repositories/authRepositoryImpl';

// Singleton DI factory instances for the auth feature
const remoteDataSource = new AuthRemoteDataSourceImpl();
const localDataSource = new AuthLocalDataSourceImpl();
export const authRepository = new AuthRepositoryImpl(remoteDataSource, localDataSource);

export const loginUseCase = new LoginUseCase(authRepository);
export const registerUseCase = new RegisterUseCase(authRepository);
export const hashPinUseCase = new HashPinUseCase();
export const logoutUseCase = new LogoutUseCase(authRepository);
