import { apiClient } from '@/core/network/apiClient';
import {
  LoginRequestDto,
  LoginResponseSchema,
  LoginResponseDto,
  RegisterRequestDto,
  UserResponseSchema,
  UserResponseDto,
  UpdatePinRequestDto,
} from '../models/authDtos';

export interface AuthRemoteDataSource {
  login(dto: LoginRequestDto): Promise<LoginResponseDto>;
  getProfile(token?: string): Promise<UserResponseDto>;
  register(dto: RegisterRequestDto): Promise<UserResponseDto>;
  savePin(dto: UpdatePinRequestDto): Promise<{ message: string; has_pin: boolean }>;
  logout(): Promise<void>;
}

export class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  async login(dto: LoginRequestDto): Promise<LoginResponseDto> {
    const response = await apiClient.post('/v1/auth/login', {
      email: dto.email,
      password: dto.password,
      device_id: dto.device_id || 'hibank-mobile-client',
    });
    return LoginResponseSchema.parse(response.data);
  }

  async getProfile(token?: string): Promise<UserResponseDto> {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const response = await apiClient.get('/v1/users/me', { headers });
    return UserResponseSchema.parse(response.data);
  }

  async register(dto: RegisterRequestDto): Promise<UserResponseDto> {
    const response = await apiClient.post('/v1/auth/register', dto);
    return UserResponseSchema.parse(response.data);
  }

  async savePin(dto: UpdatePinRequestDto): Promise<{ message: string; has_pin: boolean }> {
    const response = await apiClient.put('/v1/users/me/pin', dto);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/v1/auth/logout');
    } catch (e) {
      // Ignored if session is already invalid
    }
  }
}
