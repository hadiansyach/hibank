import {
  AuthRepository,
  LoginParams,
  RegisterParams,
  SavePinResult,
} from '../../domain/repositories/authRepository';
import { AuthSession, User } from '../../domain/entities/user';
import { AuthRemoteDataSource } from '../datasources/authRemoteDataSource';
import { AuthLocalDataSource } from '../datasources/authLocalDataSource';
import { mapLoginResponseToEntity, mapUserDtoToEntity } from '../models/authDtos';

export class AuthRepositoryImpl implements AuthRepository {
  constructor(
    private readonly remoteDataSource: AuthRemoteDataSource,
    private readonly localDataSource: AuthLocalDataSource
  ) {}

  async login(params: LoginParams): Promise<AuthSession> {
    // 1. Authenticate with backend: POST /v1/auth/login
    const loginDto = await this.remoteDataSource.login({
      email: params.email,
      password: params.password,
    });

    const token = loginDto.access_token || loginDto.session_token || loginDto.token || '';

    // 2. Fetch authenticated user profile: GET /v1/users/me
    let userProfile;
    try {
      userProfile = await this.remoteDataSource.getProfile(token);
    } catch {
      // Fallback if network hitch on profile fetch
    }

    const session = mapLoginResponseToEntity(loginDto, userProfile, params.email);

    // 3. Persist session token & user data securely
    await this.localDataSource.saveSession(session);

    return session;
  }

  async register(params: RegisterParams): Promise<User> {
    // 1. Register account with backend: POST /v1/auth/register
    const dto = await this.remoteDataSource.register({
      full_name: params.fullName,
      email: params.email,
      phone: params.phone,
      password: params.password,
    });

    // 2. Establish authenticated session in secure storage so subsequent operations (e.g. Set PIN) have Bearer token
    try {
      await this.login({
        email: params.email,
        password: params.password,
      });
    } catch {
      // Non-fatal: user is created, can log in manually if network hiccup occurs
    }

    return mapUserDtoToEntity(dto);
  }

  async savePin(pin: string): Promise<SavePinResult> {
    // Set 6-digit PIN with backend: PUT /v1/users/me/pin
    const res = await this.remoteDataSource.savePin({ pin });

    // Update locally stored user hasPin status if active
    const session = await this.localDataSource.getSession();
    if (session) {
      session.user.hasPin = res.has_pin;
      await this.localDataSource.saveSession(session);
    }

    return {
      message: res.message,
      hasPin: res.has_pin,
    };
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    return this.localDataSource.getSession();
  }

  async logout(): Promise<void> {
    // 1. Server-side session revocation: POST /v1/auth/logout
    await this.remoteDataSource.logout();

    // 2. Clear local secure hardware credentials
    await this.localDataSource.clearSession();
  }
}
