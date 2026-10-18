import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Bell, User } from 'lucide-react-native';
import { COLORS } from '@/core/theme/tokens';

interface DashboardTopBarProps {
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

export const DashboardTopBar: React.FC<DashboardTopBarProps> = ({
  onNotificationPress,
  onProfilePress,
}) => {
  return (
    <View className="h-16 px-5 flex-row items-center justify-between bg-surface-container-lowest">
      {/* Brand Monogram & Title */}
      <View className="flex-row items-center gap-2.5">
        <View className="w-9 h-9 rounded-xl bg-primary-container items-center justify-center shadow-sm">
          <Text className="text-[20px] font-black text-white tracking-tighter">H</Text>
        </View>
        <Text className="text-[20px] font-bold text-primary-container tracking-tight">
          HiBank
        </Text>
      </View>

      {/* Action Icons */}
      <View className="flex-row items-center gap-1">
        <TouchableOpacity
          className="w-11 h-11 items-center justify-center rounded-full active:bg-surface-container-low"
          onPress={onNotificationPress}
          activeOpacity={0.7}
          accessibilityLabel="Notifikasi"
        >
          <Bell size={22} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>

        <TouchableOpacity
          className="w-8 h-8 rounded-full bg-primary items-center justify-center active:opacity-85"
          onPress={onProfilePress}
          activeOpacity={0.8}
          accessibilityLabel="Profil"
        >
          <User size={16} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>
    </View>
  );
};
