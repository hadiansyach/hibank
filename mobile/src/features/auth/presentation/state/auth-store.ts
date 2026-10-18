import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
import { User, AuthSession } from '../../domain/entities/user';
import {
  authRepository,
  loginUseCase,
  registerUseCase,
  logoutUseCase,
} from '../../di/auth-factory';
import { SecureStorage } from '@/core/security/secure-storage';
import { APP_CONFIG } from '@/core/config/env';
import { subscribeToUnauthorized } from '@/core/network/api-client';
import { getDeviceId } from '@/core/security/device-integrity';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoring: boolean;
  user: User | null;
  session: AuthSession | null;
  isBiometricSupported: boolean;
  isBiometricEnabled: boolean;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, phone: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  enableBiometrics: () => Promise<boolean>;
  authenticateWithBiometrics: () => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  updatePin: (pin: string, oldPin?: string, password?: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Subscribe to automatic 401 unauthorizations from api-client
  subscribeToUnauthorized(() => {
    set({
      isAuthenticated: false,
      user: null,
      session: null,
    });
  });

  return {
    isAuthenticated: false,
    isLoading: false,
    isRestoring: true,
    user: null,
    session: null,
    isBiometricSupported: false,
    isBiometricEnabled: false,

    initialize: async () => {
      try {
        // 1. Check biometric hardware availability
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const isBioSupported = compatible && enrolled;

        // 2. Check saved biometric preference
        const bioPref = await SecureStorage.getItem(APP_CONFIG.STORAGE_KEYS.BIOMETRIC_ENABLED);
        const isBioEnabled = bioPref === 'true';

        // 3. Check saved token
        const token = await authRepository.getSavedSessionToken();
        const user = await authRepository.getSavedUserProfile();

        set({
          isAuthenticated: !!token,
          user: user || null,
          isBiometricSupported: isBioSupported,
          isBiometricEnabled: isBioEnabled,
          isRestoring: false,
        });
      } catch (error) {
        console.warn('[useAuthStore] Initialization failed', error);
        set({ isRestoring: false });
      }
    },

    login: async (email: string, password: string) => {
      set({ isLoading: true });
      try {
        const deviceId = await getDeviceId();
        const session = await loginUseCase.execute({ email, password, deviceId });
        
        // Save remembered email for easy login
        await SecureStorage.setItem(APP_CONFIG.STORAGE_KEYS.REMEMBERED_EMAIL, email);

        // Fetch real profile from backend /v1/users/me
        let currentUser: User | null = null;
        try {
          currentUser = await authRepository.fetchProfile();
        } catch {
          currentUser = await authRepository.getSavedUserProfile();
          if (!currentUser || currentUser.email.toLowerCase() !== email.toLowerCase()) {
            currentUser = {
              id: 'usr-' + email.split('@')[0],
              fullName: email.split('@')[0],
              email,
              phone: '081234567890',
              status: 'active',
              hasPin: false,
              createdAt: new Date().toISOString(),
            };
            await authRepository.saveUserProfile(currentUser);
          }
        }

        set({
          isAuthenticated: true,
          session,
          user: currentUser,
          isLoading: false,
        });
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    refreshProfile: async () => {
      try {
        const user = await authRepository.fetchProfile();
        set({ user });
      } catch (error) {
        console.warn('[useAuthStore] Failed to refresh profile', error);
      }
    },

    updatePin: async (pin: string, oldPin?: string, password?: string) => {
      const res = await authRepository.updatePin(pin, oldPin, password);
      const currentUser = get().user;
      if (currentUser) {
        set({ user: { ...currentUser, hasPin: res.hasPin } });
      }
    },

    register: async (fullName: string, email: string, phone: string, password: string) => {
      set({ isLoading: true });
      try {
        const user = await registerUseCase.execute({ fullName, email, phone, password });
        set({ isLoading: false });
        return user;
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    logout: async () => {
      set({ isLoading: true });
      try {
        await logoutUseCase.execute();
      } finally {
        set({
          isAuthenticated: false,
          user: null,
          session: null,
          isLoading: false,
        });
      }
    },

    enableBiometrics: async () => {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Aktifkan Masuk dengan Biometrik HiBank',
        cancelLabel: 'Batal',
      });
      if (result.success) {
        await SecureStorage.setItem(APP_CONFIG.STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
        set({ isBiometricEnabled: true });
        return true;
      }
      return false;
    },

    authenticateWithBiometrics: async () => {
      const { isBiometricEnabled, isBiometricSupported } = get();
      if (!isBiometricEnabled || !isBiometricSupported) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Masuk ke Akun HiBank Anda',
        cancelLabel: 'Gunakan Kata Sandi',
      });

      return result.success;
    },
  };
});

