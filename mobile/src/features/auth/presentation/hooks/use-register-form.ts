import { useState, useMemo } from 'react';
import { useAuthStore } from '../state/auth-store';
import { AppError } from '@/core/errors/app-error';

export interface PasswordStrength {
  score: number;
  label: string;
  isStrong: boolean;
}

export function useRegisterForm() {
  const { register, isLoading } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ready computed data: password strength
  const passwordStrength: PasswordStrength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const labels = ['Sangat Lemah', 'Lemah', 'Sedang', 'Kuat', 'Sangat Kuat'];
    return {
      score,
      label: labels[score] || 'Sangat Lemah',
      isStrong: score >= 3,
    };
  }, [password]);

  // Ready computed data: form validity
  const isFormValid = useMemo(() => {
    return (
      fullName.trim().length >= 3 &&
      email.includes('@') &&
      phone.trim().length >= 10 &&
      password.length >= 8
    );
  }, [fullName, email, phone, password]);

  const submitRegister = async (onSuccess: () => void) => {
    setErrorMessage(null);
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      setErrorMessage('Harap lengkapi semua data pendaftaran.');
      return;
    }

    try {
      await register(fullName.trim(), email.trim(), phone.trim(), password);
      onSuccess();
    } catch (error) {
      if (error instanceof AppError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Gagal mendaftar. Periksa kembali format data yang diinput.');
      }
    }
  };

  return {
    fullName,
    setFullName,
    email,
    setEmail,
    phone,
    setPhone,
    password,
    setPassword,
    errorMessage,
    setErrorMessage,
    isLoading,
    isFormValid,
    passwordStrength,
    submitRegister,
  };
}
