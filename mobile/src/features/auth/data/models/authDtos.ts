import { z } from 'zod';
import { User, AuthSession } from '../../domain/entities/user';

export const RegisterRequestSchema = z.object({
  full_name: z.string().min(2, 'Nama lengkap minimal 2 karakter').max(100, 'Nama lengkap maksimal 100 karakter'),
  email: z.string().email('Format email tidak valid'),
  phone: z
    .string()
    .min(10, 'Nomor handphone minimal 10 digit')
    .max(15, 'Nomor handphone maksimal 15 digit')
    .regex(/^(\+62|62|0)8[0-9]{8,12}$/, 'Nomor handphone tidak valid (gunakan awalan 08, 628, atau +628)'),
  password: z
    .string()
    .min(8, 'Kata sandi minimal 8 karakter'),
});

export type RegisterRequestDto = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi harus diisi'),
  device_id: z.string().optional(),
});

export type LoginRequestDto = z.infer<typeof LoginRequestSchema>;

export const UserResponseSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string(),
  phone: z.string(),
  status: z.string().default('active'),
  has_pin: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type UserResponseDto = z.infer<typeof UserResponseSchema>;

export const SessionResponseSchema = z.object({
  session_token: z.string().optional(),
  access_token: z.string().optional(),
  token: z.string().optional(),
  token_type: z.string().default('Bearer'),
  expires_in: z.number().default(900),
  user: UserResponseSchema.optional(),
});

export const LoginResponseSchema = SessionResponseSchema;
export type LoginResponseDto = z.infer<typeof LoginResponseSchema>;

export const UpdatePinRequestSchema = z.object({
  pin: z.string().length(6, 'PIN harus tepat 6 digit angka').regex(/^[0-9]{6}$/, 'PIN harus berupa angka'),
  old_pin: z.string().length(6).optional(),
});

export type UpdatePinRequestDto = z.infer<typeof UpdatePinRequestSchema>;

// Data Mappers from DTOs to Domain Entities
export function mapUserDtoToEntity(dto: UserResponseDto): User {
  return {
    id: dto.id,
    fullName: dto.full_name,
    email: dto.email,
    phone: dto.phone,
    status: dto.status,
    hasPin: dto.has_pin ?? false,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export function mapLoginResponseToEntity(
  dto: LoginResponseDto,
  userProfile?: UserResponseDto,
  fallbackEmail?: string
): AuthSession {
  const token = dto.access_token || dto.session_token || dto.token || '';

  const user: User = userProfile
    ? mapUserDtoToEntity(userProfile)
    : dto.user
    ? mapUserDtoToEntity(dto.user)
    : {
        id: 'usr_active',
        fullName: 'Nasabah HiBank',
        email: fallbackEmail || 'nasabah@hibank.com',
        phone: '081234567890',
        status: 'active',
        hasPin: false,
      };

  return {
    token,
    user,
  };
}
