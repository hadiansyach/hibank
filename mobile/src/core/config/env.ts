import { Platform, NativeModules } from 'react-native';

function resolveApiBaseUrl(): string {
  // If in development mode, check if Metro bundler is serving over LAN IP (e.g. Expo Go on physical device)
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (scriptURL) {
    try {
      const match = scriptURL.match(/^https?:\/\/([^/:]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return `http://${match[1]}:8080`;
      }
    } catch {
      // Fallback
    }
  }

  // If explicit environment variable is configured
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl;
  }

  // Android emulator fallback
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080';
  }

  // iOS simulator / Web / localhost
  return 'http://localhost:8080';
}

export const ENV = {
  get API_BASE_URL(): string {
    return resolveApiBaseUrl();
  },
  API_TIMEOUT_MS: 15000,
  APP_NAME: 'hibank Mobile',
  ARGON2_PARAMS: {
    // Client-side parameters tuned for mobile devices:
    iterations: 2,
    memoryKiB: 19456, // 19 MiB
    parallelism: 1,
    keyLength: 32,
  },
} as const;

