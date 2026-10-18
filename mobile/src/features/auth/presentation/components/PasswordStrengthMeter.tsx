import React from 'react';
import { View, Text } from 'react-native';

interface PasswordStrengthMeterProps {
  score: number;
  label: string;
}

const getBarColor = (score: number, index: number): string => {
  if (index >= score) return 'bg-surface-low';
  if (score <= 1) return 'bg-error';
  if (score === 2) return 'bg-warning';
  return 'bg-success';
};

const getTextColor = (score: number): string => {
  if (score === 0) return 'text-on-surface-variant';
  if (score <= 1) return 'text-error';
  if (score === 2) return 'text-warning';
  return 'text-success';
};

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  score,
  label,
}) => {
  return (
    <View className="-mt-1 mb-3.5">
      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-[11px] font-medium text-on-surface-variant">Kekuatan Kata Sandi</Text>
        <Text className={`text-[11px] font-bold ${getTextColor(score)}`}>
          {label}
        </Text>
      </View>
      <View className="flex-row gap-1 h-1">
        {[0, 1, 2, 3].map((barIndex) => (
          <View
            key={barIndex}
            className={`flex-1 rounded-full ${getBarColor(score, barIndex)}`}
          />
        ))}
      </View>
    </View>
  );
};
