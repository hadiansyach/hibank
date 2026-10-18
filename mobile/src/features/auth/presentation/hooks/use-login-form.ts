import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuthStore } from '../state/auth-store';
import { SecureStorage } from '@/core/security/secure-storage';
import { APP_CONFIG } from '@/core/config/env';
import { ScreenShield } from '@/core/security/screen-shield';
import { AppError } from '@/core/errors/app-error';

export function useLoginForm() {
  const { login, isLoading, isBiometricEnabled, authenticateWithBiometrics } = useAuthStore();

  const [email, setEmail] = useState('budi@hibank.com');
  const [password, setPassword] = useState('Password123!');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    ScreenShield.enable();
    SecureStorage.getItem(APP_CONFIG.STORAGE_KEYS.REMEMBERED_EMAIL).then((savedEmail) => {
      if (savedEmail) setEmail(savedEmail);
    });
    return () => {
      ScreenShield.disable();
    };
  }, []);

  const handleLogin = async (onSuccess: () => void) => {
    setErrorMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage('Silakan isi email dan kata sandi Anda.');
      return;
    }

    try {
      if (rememberMe) {
        await SecureStorage.setItem(APP_CONFIG.STORAGE_KEYS.REMEMBERED_EMAIL, email.trim());
      }
      await login(email.trim(), password);
      onSuccess();
    } catch (error) {
      if (error instanceof AppError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Gagal masuk. Periksa koneksi backend atau kredensial Anda.');
      }
    }
  };

  const handleBiometricAuth = async (onSuccess: () => void) => {
    try {
      const success = await authenticateWithBiometrics();
      if (success) {
        onSuccess();
      }
    } catch {
      Alert.alert('Biometrik', 'Verifikasi biometrik gagal atau dibatalkan.');
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    errorMessage,
    setErrorMessage,
    isLoading,
    isBiometricEnabled,
    handleLogin,
    handleBiometricAuth,
  };
}
