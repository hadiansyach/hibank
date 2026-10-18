import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '@/features/auth/presentation/state/auth-store';
import { PrivacyMask } from '@/core/security/privacy-mask';
import { InactivityProvider } from '@/core/security/inactivity-tracker';

import Toast from 'react-native-toast-message';
import '../global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 30,
    },
  },
});

function RootNavigationLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isRestoring, initialize, logout } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isRestoring) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if user is not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to main tabs if already authenticated
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isRestoring, segments, router]);

  if (isRestoring) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066FF" />
      </View>
    );
  }

  return (
    <InactivityProvider isEnabled={isAuthenticated} onTimeout={() => logout()}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="transfer/index"
          options={{
            presentation: 'card',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="topup/index"
          options={{
            presentation: 'card',
            headerShown: false,
          }}
        />
      </Stack>
    </InactivityProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{flex: 1}} edges={['bottom']}>
        <QueryClientProvider client={queryClient}>
          <PrivacyMask>
            <RootNavigationLayout />
          </PrivacyMask>
        </QueryClientProvider>
        <Toast position='bottom' avoidKeyboard />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A2540',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
