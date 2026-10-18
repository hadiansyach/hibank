import React from 'react';
import { View, ViewProps } from 'react-native';
import { SafeAreaView, Edge, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../theme/tokens';

export type StatusBarStyle = 'light' | 'dark' | 'auto' | 'light-content' | 'dark-content';

interface ScreenContainerProps extends ViewProps {
  edges?: Edge[];
  backgroundColor?: string;
  topInsetBackgroundColor?: string; // Menentukan warna background status bar agar dinamis mengikuti AppBar
  barStyle?: StatusBarStyle;
  className?: string;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  edges = ['top', 'left', 'right'],
  backgroundColor = COLORS.canvas,
  topInsetBackgroundColor,
  barStyle = 'dark',
  className = '',
  ...props
}) => {
  const insets = useSafeAreaInsets();
  const includesTop = edges.includes('top');
  const otherEdges = edges.filter((e) => e !== 'top');

  // Normalisasi barStyle untuk expo-status-bar
  const resolvedBarStyle =
    barStyle === 'light-content' ? 'light' : barStyle === 'dark-content' ? 'dark' : barStyle;

  // Warna status bar: prioritaskan topInsetBackgroundColor, fallback ke backgroundColor jika includesTop aktif
  const statusBgColor = topInsetBackgroundColor ?? (includesTop ? backgroundColor : 'transparent');

  return (
    <View style={[{ flex: 1, backgroundColor }]}>
      <StatusBar style={resolvedBarStyle} />

      {/* Top Inset Filler: Menjamin status bar mengikuti warna AppBar secara dinamis */}
      {includesTop && insets.top > 0 && (
        <View style={{ height: insets.top, backgroundColor: statusBgColor }} />
      )}

      {/* Body Screen Container */}
      <SafeAreaView edges={otherEdges} style={[{ flex: 1, backgroundColor }]}>
        <View className={`flex-1 ${className}`} style={style} {...props}>
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
};
