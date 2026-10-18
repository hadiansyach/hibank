import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  requireAuthentication: false,
};

/**
 * Hardware-backed Secure Storage Service
 * Uses iOS Keychain and Android KeyStore EncryptedSharedPreferences
 */
export const SecureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
    } catch (error) {
      console.error(`[SecureStorage] Failed to set item: ${key}`, error);
      throw error;
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
    } catch (error) {
      console.error(`[SecureStorage] Failed to get item: ${key}`, error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
    } catch (error) {
      console.error(`[SecureStorage] Failed to remove item: ${key}`, error);
    }
  },

  async setObject<T>(key: string, value: T): Promise<void> {
    await this.setItem(key, JSON.stringify(value));
  },

  async getObject<T>(key: string): Promise<T | null> {
    const raw = await this.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
};

