import * as ScreenCapture from 'expo-screen-capture';
import { Platform } from 'react-native';

/**
 * Screen Shield Service
 * Prevents screenshots and screen recording on sensitive banking screens (FLAG_SECURE on Android).
 */
export const ScreenShield = {
  /**
   * Activate anti-screenshot and anti-screen-recording protection
   */
  async enable(): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      await ScreenCapture.preventScreenCaptureAsync();
    } catch (error) {
      console.warn('[ScreenShield] Failed to enable screen capture prevention', error);
    }
  },

  /**
   * Deactivate anti-screenshot protection (e.g., when viewing non-sensitive help/public screens)
   */
  async disable(): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      await ScreenCapture.allowScreenCaptureAsync();
    } catch (error) {
      console.warn('[ScreenShield] Failed to disable screen capture prevention', error);
    }
  },
};

