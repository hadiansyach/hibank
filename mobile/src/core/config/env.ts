import { Platform } from 'react-native';

const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Android Emulator uses 10.0.2.2 to connect to host machine localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080';
  }
  // iOS Simulator & macOS use localhost
  return 'http://localhost:8080';
};

export const APP_CONFIG = {
  APP_NAME: 'HiBank',
  API_BASE_URL: getBaseUrl(),
  API_TIMEOUT_MS: 15000,
  SESSION_INACTIVITY_TIMEOUT_SECONDS: 15 * 60, // 15 minutes matching backend sliding window
  STORAGE_KEYS: {
    SESSION_TOKEN: 'hibank_session_token',
    REFRESH_TOKEN: 'hibank_refresh_token',
    DEVICE_ID: 'hibank_device_id',
    USER_PROFILE: 'hibank_user_profile',
    BIOMETRIC_ENABLED: 'hibank_biometric_enabled',
    REMEMBERED_EMAIL: 'hibank_remembered_email',
  },
} as const;

