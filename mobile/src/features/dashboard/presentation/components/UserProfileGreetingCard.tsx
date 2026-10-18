import React from 'react';
import { View, Text } from 'react-native';
import { ReadyUserProfile } from '../hooks/use-dashboard-data';

interface UserProfileGreetingCardProps {
  user: ReadyUserProfile;
}

export const UserProfileGreetingCard: React.FC<UserProfileGreetingCardProps> = ({
  user,
}) => {
  return (
    <View className="flex-row items-center justify-between bg-surface-lowest border border-outline-variant p-3 rounded-card shadow-sm mb-4">
      {/* Avatar & User Details */}
      <View className="flex-row items-center gap-3 flex-1 pr-2">
        <View className="relative">
          <View className="w-11 h-11 rounded-full bg-secondary-fixed items-center justify-center">
            <Text className="text-[15px] font-bold text-primary-container">
              {user.initials}
            </Text>
          </View>
          {/* Lime Online Dot with White Ring */}
          <View className="absolute bottom-0 right-0 w-3 h-3 bg-tertiary-fixed rounded-full border-2 border-white" />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-1.5 mb-0.5">
            <Text className="text-[15px] font-bold text-on-surface" numberOfLines={1}>
              {user.greeting}
            </Text>
            <View className="px-2 py-0.5 rounded-full bg-success-container">
              <Text className="text-[10px] font-bold text-success">Active</Text>
            </View>
          </View>
          <Text className="text-[12px] text-on-surface-variant font-medium" numberOfLines={1}>
            {user.idNasabah}
          </Text>
        </View>
      </View>
    </View>
  );
};
