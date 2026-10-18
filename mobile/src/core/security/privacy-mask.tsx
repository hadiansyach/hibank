import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus, StyleSheet, View, Text } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';

interface PrivacyMaskProps {
  children: React.ReactNode;
}

/**
 * PrivacyMask wraps the application.
 * When the app goes to 'background' or 'inactive' (e.g. App Switcher / Multitasking),
 * it displays an opaque security overlay to prevent sensitive financial data from being exposed.
 */
export const PrivacyMask: React.FC<PrivacyMaskProps> = ({ children }) => {
  const [isMasked, setIsMasked] = useState<boolean>(false);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        setIsMasked(true);
      } else if (nextAppState === 'active') {
        setIsMasked(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      {children}
      {isMasked && (
        <View style={styles.maskOverlay} pointerEvents="auto">
          <View style={styles.content}>
            <ShieldCheck size={56} color="#0066FF" />
            <Text style={styles.title}>HiBank</Text>
            <Text style={styles.subtitle}>Aplikasi terlindungi demi keamanan data Anda</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  maskOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A2540',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#ADCFFF',
    marginTop: 8,
    textAlign: 'center',
  },
});
