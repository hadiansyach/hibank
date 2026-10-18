import { apiClient } from '@/core/network/api-client';
import {
  LoginRequestDto,
  SessionResponseDto,
  RegisterRequestDto,
  UserResponseDto,
} from '../models/auth.dto';

export interface IAuthRemoteDataSource {
  login(dto: LoginRequestDto): Promise<SessionResponseDto>;
  register(dto: RegisterRequestDto): Promise<UserResponseDto>;
  refresh(): Promise<SessionResponseDto>;
  logout(): Promise<void>;
  getProfile(): Promise<UserResponseDto>;
  updatePin(pin: string, oldPin?: string, password?: string): Promise<{ message: string; has_pin: boolean }>;
}

export class AuthRemoteDataSourceImpl implements IAuthRemoteDataSource {
  async login(dto: LoginRequestDto): Promise<SessionResponseDto> {
    const response = await apiClient.post<SessionResponseDto>('/v1/auth/login', dto);
    return response.data;
  }

  async register(dto: RegisterRequestDto): Promise<UserResponseDto> {
    const response = await apiClient.post<UserResponseDto>('/v1/auth/register', dto);
    return response.data;
  }

  async refresh(): Promise<SessionResponseDto> {
    const response = await apiClient.post<SessionResponseDto>('/v1/auth/refresh');
    return response.data;
  }

  async logout(): Promise<void> {
    await apiClient.post('/v1/auth/logout');
  }

  async getProfile(): Promise<UserResponseDto> {
    const response = await apiClient.get<UserResponseDto>('/v1/users/me');
    return response.data;
  }

  async updatePin(pin: string, oldPin?: string, password?: string): Promise<{ message: string; has_pin: boolean }> {
    const response = await apiClient.put<{ message: string; has_pin: boolean }>('/v1/users/me/pin', {
      pin,
      old_pin: oldPin,
      password,
    });
    return response.data;
  }
}

