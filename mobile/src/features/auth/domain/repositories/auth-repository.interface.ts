import { User, AuthSession } from '../entities/user';

export interface LoginParams {
  email: string;
  password: string;
  deviceId?: string;
}

export interface RegisterParams {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface IAuthRepository {
  login(params: LoginParams): Promise<AuthSession>;
  register(params: RegisterParams): Promise<User>;
  refreshSession(): Promise<AuthSession>;
  logout(): Promise<void>;
  saveSession(session: AuthSession): Promise<void>;
  clearSession(): Promise<void>;
  getSavedSessionToken(): Promise<string | null>;
  saveUserProfile(user: User): Promise<void>;
  getSavedUserProfile(): Promise<User | null>;
  fetchProfile(): Promise<User>;
  updatePin(pin: string, oldPin?: string, password?: string): Promise<{ message: string; hasPin: boolean }>;
}

