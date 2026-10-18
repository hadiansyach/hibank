import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { formatRupiah } from '@/features/accounts/domain/entities/account';

const PRESET_CHIPS = [100000, 250000, 500000, 1000000, 2500000];

interface TopupChipsGridProps {
  selectedAmount: number;
  onSelectAmount: (val: number) => void;
}

export const TopupChipsGrid: React.FC<TopupChipsGridProps> = ({
  selectedAmount,
  onSelectAmount,
}) => {
  return (
    <View className="mb-4">
      <Text className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
        PILIH NOMINAL CEPAT
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {PRESET_CHIPS.map((chipVal) => {
          const isSelected = selectedAmount === chipVal;
          return (
            <TouchableOpacity
              key={chipVal}
              className={`w-[31%] py-2.5 rounded-control border items-center justify-center ${
                isSelected
                  ? 'bg-primary-container border-primary-container shadow-sm'
                  : 'bg-surface-low border-outline-variant'
              }`}
              onPress={() => onSelectAmount(chipVal)}
              activeOpacity={0.8}
            >
              <Text
                className={`text-[12px] font-bold ${
                  isSelected ? 'text-white' : 'text-on-surface'
                }`}
              >
                {formatRupiah(chipVal)}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          className="w-[31%] py-2.5 rounded-control border border-outline-variant bg-surface-low items-center justify-center"
          onPress={() => onSelectAmount(100000)}
          activeOpacity={0.8}
        >
          <Text className="text-[12px] font-semibold text-on-surface">Lainnya...</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
