import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '@/core/theme/tokens';

interface SecuritySettingItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showDivider?: boolean;
}

export const SecuritySettingItem: React.FC<SecuritySettingItemProps> = ({
  icon,
  title,
  description,
  rightElement,
  onPress,
  showDivider = true,
}) => {
  const content = (
    <View className="flex-row items-center py-3.5">
      <View className="w-10 h-10 rounded-xl bg-surface-low items-center justify-center mr-3.5 border border-outline-variant">
        {icon}
      </View>
      <View className="flex-1 pr-2">
        <Text className="text-[13px] font-bold text-on-surface">{title}</Text>
        <Text className="text-[11px] text-on-surface-variant mt-0.5 leading-4">
          {description}
        </Text>
      </View>
      {rightElement && <View>{rightElement}</View>}
    </View>
  );

  return (
    <View>
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {content}
        </TouchableOpacity>
      ) : (
        content
      )}
      {showDivider && (
        <View
          style={{ height: 1, backgroundColor: COLORS.outlineVariant }}
          className="my-0.5"
        />
      )}
    </View>
  );
};
