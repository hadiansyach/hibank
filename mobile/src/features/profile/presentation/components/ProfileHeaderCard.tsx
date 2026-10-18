import React from 'react';
import { View, Text } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { Card } from '@/core/components/Card';
import { Badge } from '@/core/components/Badge';
import { COLORS } from '@/core/theme/tokens';
import { User } from '@/features/auth/domain/entities/user';

interface ProfileHeaderCardProps {
  user: User | null;
}

export const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({ user }) => {
  const getInitials = (name?: string) => {
    if (!name) return 'BS';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Card className="p-4 mb-5">
      <View className="flex-row items-center gap-3.5">
        <View className="w-[52px] h-[52px] rounded-full bg-primary-container items-center justify-center">
          <Text className="text-[17px] font-extrabold text-white">
            {getInitials(user?.fullName)}
          </Text>
        </View>

        <View className="flex-1 pr-2">
          <View className="flex-row items-center gap-2 mb-0.5">
            <Text className="text-[16px] font-bold text-on-surface" numberOfLines={1}>
              {user?.fullName || 'Budi Santoso'}
            </Text>
          </View>
          <Text className="text-[12px] text-on-surface-variant font-medium">
            {user?.email || 'budi@hibank.com'}
          </Text>
          <Text className="text-[11px] text-on-surface-variant/80 font-mono mt-0.5">
            {user?.phone || '081234567890'}
          </Text>
        </View>

        <Badge
          label="Level 2"
          variant="info"
          icon={<CheckCircle2 size={12} color={COLORS.secondary} />}
        />
      </View>
    </Card>
  );
};
