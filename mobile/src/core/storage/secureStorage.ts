import * as SecureStore from 'expo-secure-store';

export enum SecureStorageKeys {
  AUTH_TOKEN = 'hibank_auth_token',
  USER_DATA = 'hibank_user_data',
  BIOMETRIC_KEY = 'hibank_biometric_key',
}

export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`[SecureStorage] Error saving key "${key}":`, error);
      throw error;
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`[SecureStorage] Error getting key "${key}":`, error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`[SecureStorage] Error removing key "${key}":`, error);
      throw error;
    }
  },

  async setObject<T>(key: string, value: T): Promise<void> {
    const json = JSON.stringify(value);
    await this.setItem(key, json);
  },

  async getObject<T>(key: string): Promise<T | null> {
    const raw = await this.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`[SecureStorage] Error parsing object for key "${key}":`, error);
      return null;
    }
  },
};
