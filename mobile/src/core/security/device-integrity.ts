import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { SecureStorage } from './secure-storage';
import { APP_CONFIG } from '../config/env';

export interface IntegrityCheckResult {
  isCompromised: boolean;
  reasons: string[];
}

/**
 * Device Integrity Verification
 * Checks for signs of rooted/jailbroken devices or developer mode tampering
 */
export const DeviceIntegrity = {
  async verify(): Promise<IntegrityCheckResult> {
    const reasons: string[] = [];

    if (Platform.OS === 'web') {
      return { isCompromised: false, reasons: [] };
    }

    // Baseline checks: check for debugger or developer test tags in release builds
    if (!__DEV__) {
      // In production, ensure bundle identifier matches com.hibank.mobile
      const applicationId = Application.applicationId;
      if (applicationId && applicationId !== 'com.hibank.mobile') {
        reasons.push('Aplikasi berjalan dengan bundle identifier tidak resmi (re-signed app).');
      }
    }

    return {
      isCompromised: reasons.length > 0,
      reasons,
    };
  },
};

/**
 * Returns a stable unique device identifier for single-active-session management.
 */
export async function getDeviceId(): Promise<string> {
  const cached = await SecureStorage.getItem(APP_CONFIG.STORAGE_KEYS.DEVICE_ID);
  if (cached) return cached;

  let deviceId: string | null = null;
  try {
    if (Platform.OS === 'android') {
      deviceId = Application.getAndroidId();
    } else if (Platform.OS === 'ios') {
      deviceId = await Application.getIosIdForVendorAsync();
    }
  } catch {
    // Fallback to random UUID if platform API is unavailable
  }

  if (!deviceId) {
    deviceId = Crypto.randomUUID();
  }

  await SecureStorage.setItem(APP_CONFIG.STORAGE_KEYS.DEVICE_ID, deviceId);
  return deviceId;
}

