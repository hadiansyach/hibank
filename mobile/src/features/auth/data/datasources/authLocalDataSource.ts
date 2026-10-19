import { secureStorage, SecureStorageKeys } from '@/core/storage/secureStorage';
import { User, AuthSession } from '../../domain/entities/user';

export interface AuthLocalDataSource {
  saveSession(session: AuthSession): Promise<void>;
  getSession(): Promise<AuthSession | null>;
  clearSession(): Promise<void>;
}

export class AuthLocalDataSourceImpl implements AuthLocalDataSource {
  async saveSession(session: AuthSession): Promise<void> {
    await secureStorage.setItem(SecureStorageKeys.AUTH_TOKEN, session.token);
    await secureStorage.setObject<User>(SecureStorageKeys.USER_DATA, session.user);
  }

  async getSession(): Promise<AuthSession | null> {
    const token = await secureStorage.getItem(SecureStorageKeys.AUTH_TOKEN);
    const user = await secureStorage.getObject<User>(SecureStorageKeys.USER_DATA);

    if (!token || !user) {
      return null;
    }

    return { token, user };
  }

  async clearSession(): Promise<void> {
    await secureStorage.removeItem(SecureStorageKeys.AUTH_TOKEN);
    await secureStorage.removeItem(SecureStorageKeys.USER_DATA);
  }
}
