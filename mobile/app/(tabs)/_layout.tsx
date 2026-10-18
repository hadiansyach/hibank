import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, ArrowLeftRight, User } from 'lucide-react-native';
import { COLORS } from '@/core/theme/tokens';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  // Dynamic bottom padding to handle Android gesture/nav bar and iOS home indicator smoothly

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: COLORS.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: COLORS.error,
          borderTopColor: COLORS.outlineVariant,
          borderTopWidth: 1,
          paddingVertical: 0,
          elevation: 8,
          shadowColor: '#172B4D',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.1,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, focused }) => (
            <Home size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Mutasi',
          tabBarIcon: ({ color, focused }) => (
            <ArrowLeftRight size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil & Keamanan',
          tabBarIcon: ({ color, focused }) => (
            <User size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}
