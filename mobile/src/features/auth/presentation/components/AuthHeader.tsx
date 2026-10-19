import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AuthHeaderProps {
  onBack?: () => void;
  subtitle?: string;
  stepIndicator?: string;
}

export function AuthHeader({ onBack, subtitle = 'Perbankan Tenang', stepIndicator }: AuthHeaderProps) {
  return (
    <View className="flex-row items-center justify-between py-4 mb-2">
      <View className="flex-row items-center space-x-3">
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            className="w-10 h-10 rounded-full bg-[#EFEDF3] items-center justify-center mr-2 active:bg-[#E5E2E9]"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Kembali"
          >
            <Ionicons name="arrow-back" size={20} color="#282734" />
          </TouchableOpacity>
        ) : (
          <View className="w-10 h-10 rounded-xl bg-[#6654D9] items-center justify-center shadow-sm mr-2.5">
            <Text className="text-white font-bold text-xl tracking-tight leading-none">
              H
            </Text>
          </View>
        )}

        <View>
          <Text className="text-[19px] font-bold text-[#282734] tracking-tight leading-none">
            HiBank
          </Text>
          <Text className="text-[12px] font-medium text-[#747280] mt-0.5 leading-none">
            {subtitle}
          </Text>
        </View>
      </View>

      {stepIndicator ? (
        <View className="px-3 py-1 rounded-full bg-[#EFEDF3]">
          <Text className="text-[11px] font-semibold text-[#6654D9]">
            {stepIndicator}
          </Text>
        </View>
      ) : (
        <View className="w-9 h-9 rounded-full bg-[#EFEDF3] items-center justify-center">
          <Ionicons name="shield-checkmark-outline" size={18} color="#6654D9" />
        </View>
      )}
    </View>
  );
}
