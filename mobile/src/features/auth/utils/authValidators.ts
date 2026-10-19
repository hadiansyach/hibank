import { z } from 'zod';

export const loginValidationSchema = z.object({
  email: z.string().min(1, 'Alamat email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export type LoginFormValues = z.infer<typeof loginValidationSchema>;

export const registerValidationSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Nama lengkap minimal 2 karakter')
      .max(100, 'Nama lengkap maksimal 100 karakter'),
    email: z
      .string()
      .min(1, 'Alamat email wajib diisi')
      .email('Format email tidak valid'),
    phone: z
      .string()
      .min(10, 'Nomor handphone minimal 10 digit')
      .max(15, 'Nomor handphone maksimal 15 digit')
      .regex(/^(\+62|62|0)8[0-9]{8,12}$/, 'Nomor handphone tidak valid (gunakan awalan 08, 628, atau +628)'),
    password: z
      .string()
      .min(8, 'Kata sandi minimal 8 karakter')
      .regex(/[A-Z]/, 'Harus memuat minimal satu huruf besar (A-Z)')
      .regex(/[a-z]/, 'Harus memuat minimal satu huruf kecil (a-z)')
      .regex(/[0-9]/, 'Harus memuat minimal satu angka (0-9)'),
    confirmPassword: z.string().min(1, 'Konfirmasi kata sandi wajib diisi'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerValidationSchema>;

export const setPinValidationSchema = z
  .object({
    pin: z.string().length(6, 'PIN harus tepat 6 digit').regex(/^\d{6}$/, 'PIN harus berupa angka'),
    confirmPin: z.string().length(6, 'Konfirmasi PIN harus 6 digit'),
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: 'Konfirmasi PIN tidak cocok',
    path: ['confirmPin'],
  });

export type SetPinFormValues = z.infer<typeof setPinValidationSchema>;
