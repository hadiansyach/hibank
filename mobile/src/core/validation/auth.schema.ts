import { z } from 'zod';

// Indonesian mobile phone regex matching HiBank backend: ^(\+62|62|0)8[1-9][0-9]{6,11}$
export const indonesianPhoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;

export const registerSchema = z.object({
  fullName: z
    .string({ required_error: 'Nama lengkap wajib diisi' })
    .trim()
    .min(2, 'Nama lengkap harus antara 2 dan 100 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter'),
  email: z
    .string({ required_error: 'Alamat email wajib diisi' })
    .trim()
    .email('Format email tidak valid (contoh: nasabah@hibank.com)'),
  phone: z
    .string({ required_error: 'Nomor ponsel wajib diisi' })
    .trim()
    .regex(
      indonesianPhoneRegex,
      'Nomor ponsel harus nomor Indonesia yang valid diawali 08, 628, atau +628 (10-15 digit)'
    ),
  password: z
    .string({ required_error: 'Kata sandi wajib diisi' })
    .min(8, 'Kata sandi harus minimal 8 karakter'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email wajib diisi' })
    .trim()
    .email('Format email tidak valid'),
  password: z
    .string({ required_error: 'Kata sandi wajib diisi' })
    .min(1, 'Kata sandi wajib diisi'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const pinSchema = z.object({
  pin: z
    .string({ required_error: 'PIN wajib diisi' })
    .regex(/^[0-9]{6}$/, 'PIN harus berupa 6 digit angka'),
  oldPin: z
    .string()
    .regex(/^[0-9]{6}$/, 'PIN lama harus berupa 6 digit angka')
    .optional(),
});
