import { AuthSession, User } from '../entities/user';

export interface RegisterParams {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface SavePinResult {
  message: string;
  hasPin: boolean;
}

export interface AuthRepository {
  login(params: LoginParams): Promise<AuthSession>;
  register(params: RegisterParams): Promise<User>;
  savePin(pin: string): Promise<SavePinResult>;
  getCurrentSession(): Promise<AuthSession | null>;
  logout(): Promise<void>;
}
