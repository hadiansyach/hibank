import React from 'react';
import { View, Text } from 'react-native';

interface RegisterStepBarProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
}

export const RegisterStepBar: React.FC<RegisterStepBarProps> = ({
  currentStep,
  totalSteps,
  stepTitle,
}) => {
  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <View className="bg-surface-container px-2.5 py-1 rounded-md">
          <Text className="text-[11px] font-bold text-secondary">
            Langkah {currentStep} dari {totalSteps}: {stepTitle}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-1.5 h-1">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isActive = index < currentStep;
          return (
            <View
              key={index}
              className={`flex-1 rounded-full ${
                isActive ? 'bg-secondary' : 'bg-surface-low'
              }`}
            />
          );
        })}
      </View>
    </View>
  );
};
