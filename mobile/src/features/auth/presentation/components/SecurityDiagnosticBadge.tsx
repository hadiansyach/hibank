import React from 'react';
import { View, Text } from 'react-native';

interface SecurityDiagnosticBadgeProps {
  label?: string;
  statusText?: string;
}

export const SecurityDiagnosticBadge: React.FC<SecurityDiagnosticBadgeProps> = ({
  statusText = 'Local API • Ready',
}) => {
  return (
    <View className="flex-row items-center bg-surface-low border border-outline-variant px-3 py-1 rounded-full">
      <View className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
      <Text className="text-[11px] font-semibold text-on-surface-variant">
        {statusText}
      </Text>
    </View>
  );
};
