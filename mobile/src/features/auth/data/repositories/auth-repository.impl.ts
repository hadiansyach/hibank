import {
  IAuthRepository,
  LoginParams,
  RegisterParams,
} from '../../domain/repositories/auth-repository.interface';
import { User, AuthSession } from '../../domain/entities/user';
import { IAuthRemoteDataSource } from '../datasources/auth-remote-datasource';
import { SecureStorage } from '@/core/security/secure-storage';
import { APP_CONFIG } from '@/core/config/env';

export class AuthRepositoryImpl implements IAuthRepository {
  constructor(private readonly remoteDataSource: IAuthRemoteDataSource) {}

  async login(params: LoginParams): Promise<AuthSession> {
    const response = await this.remoteDataSource.login({
      email: params.email,
      password: params.password,
      device_id: params.deviceId,
    });

    const session: AuthSession = {
      sessionToken: response.session_token,
      refreshToken: response.refresh_token,
      accessToken: response.access_token || response.session_token,
      tokenType: response.token_type || 'Bearer',
      expiresIn: response.expires_in,
    };
    await this.saveSession(session);
    return session;
  }

  async register(params: RegisterParams): Promise<User> {
    const response = await this.remoteDataSource.register({
      full_name: params.fullName,
      email: params.email,
      phone: params.phone,
      password: params.password,
    });

    return {
      id: response.id,
      fullName: response.full_name,
      email: response.email,
      phone: response.phone,
      status: response.status,
      hasPin: response.has_pin ?? response.is_pin_set ?? false,
      createdAt: response.created_at,
    };
  }

  async refreshSession(): Promise<AuthSession> {
    const response = await this.remoteDataSource.refresh();
    const session: AuthSession = {
      sessionToken: response.session_token,
      refreshToken: response.refresh_token,
      accessToken: response.access_token || response.session_token,
      tokenType: response.token_type || 'Bearer',
      expiresIn: response.expires_in,
    };
    await this.saveSession(session);
    return session;
  }

  async logout(): Promise<void> {
    await this.remoteDataSource.logout();
  }

  async saveSession(session: AuthSession): Promise<void> {
    await SecureStorage.setItem(APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN, session.sessionToken);
    if (session.refreshToken) {
      await SecureStorage.setItem(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, session.refreshToken);
    }
  }

  async clearSession(): Promise<void> {
    await SecureStorage.removeItem(APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN);
    await SecureStorage.removeItem(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
    await SecureStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER_PROFILE);
  }

  async getSavedSessionToken(): Promise<string | null> {
    return await SecureStorage.getItem(APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN);
  }

  async saveUserProfile(user: User): Promise<void> {
    await SecureStorage.setObject(APP_CONFIG.STORAGE_KEYS.USER_PROFILE, user);
  }

  async getSavedUserProfile(): Promise<User | null> {
    return await SecureStorage.getObject<User>(APP_CONFIG.STORAGE_KEYS.USER_PROFILE);
  }

  async fetchProfile(): Promise<User> {
    const dto = await this.remoteDataSource.getProfile();
    const user: User = {
      id: dto.id,
      fullName: dto.full_name,
      email: dto.email,
      phone: dto.phone,
      status: dto.status,
      hasPin: dto.has_pin ?? dto.is_pin_set ?? false,
      createdAt: dto.created_at,
    };
    await this.saveUserProfile(user);
    return user;
  }

  async updatePin(pin: string, oldPin?: string, password?: string): Promise<{ message: string; hasPin: boolean }> {
    const res = await this.remoteDataSource.updatePin(pin, oldPin, password);
    const currentUser = await this.getSavedUserProfile();
    if (currentUser) {
      currentUser.hasPin = res.has_pin;
      await this.saveUserProfile(currentUser);
    }
    return {
      message: res.message,
      hasPin: res.has_pin,
    };
  }
}

