import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export type HistoryFilterType = 'ALL' | 'IN' | 'OUT' | 'TOPUP';

interface HistoryFilterBarProps {
  activeFilter: HistoryFilterType;
  onSelectFilter: (filter: HistoryFilterType) => void;
}

const TABS: { key: HistoryFilterType; label: string }[] = [
  { key: 'ALL', label: 'Semua' },
  { key: 'IN', label: 'Masuk' },
  { key: 'OUT', label: 'Keluar' },
  { key: 'TOPUP', label: 'Top Up' },
];

export const HistoryFilterBar: React.FC<HistoryFilterBarProps> = ({
  activeFilter,
  onSelectFilter,
}) => {
  return (
    <View className="flex-row px-5 py-3 gap-2 bg-canvas">
      {TABS.map((tab) => {
        const isActive = activeFilter === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            className={`px-4 py-2 rounded-full items-center justify-center ${
              isActive
                ? 'bg-primary-container shadow-sm'
                : 'bg-surface-lowest border border-outline-variant shadow-sm'
            }`}
            onPress={() => onSelectFilter(tab.key)}
            activeOpacity={0.8}
          >
            <Text
              className={`text-[12px] font-semibold tracking-tight ${
                isActive ? 'text-white font-bold' : 'text-on-surface-variant'
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
