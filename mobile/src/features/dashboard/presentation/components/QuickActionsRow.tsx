import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowUpRight, Wallet, Receipt } from 'lucide-react-native';
import { COLORS } from '@/core/theme/tokens';

interface QuickActionsRowProps {
  onTransferPress: () => void;
  onTopupPress: () => void;
  onHistoryPress: () => void;
}

export const QuickActionsRow: React.FC<QuickActionsRowProps> = ({
  onTransferPress,
  onTopupPress,
  onHistoryPress,
}) => {
  return (
    <View className="flex-row gap-2.5 mb-5">
      {/* 1. Transfer */}
      <TouchableOpacity
        className="flex-1 items-center justify-center py-3.5 px-2 rounded-card bg-surface-lowest border border-outline-variant shadow-sm active:scale-95"
        onPress={onTransferPress}
        activeOpacity={0.75}
      >
        <View className="w-12 h-12 rounded-full bg-surface-container items-center justify-center mb-2">
          <ArrowUpRight size={22} color={COLORS.secondary} strokeWidth={2.4} />
        </View>
        <Text className="text-[13px] font-semibold text-on-surface text-center">
          Transfer
        </Text>
      </TouchableOpacity>

      {/* 2. Top Up Saldo */}
      <TouchableOpacity
        className="flex-1 items-center justify-center py-3.5 px-2 rounded-card bg-surface-lowest border border-outline-variant shadow-sm active:scale-95"
        onPress={onTopupPress}
        activeOpacity={0.75}
      >
        <View className="w-12 h-12 rounded-full bg-[#EEF7C8] items-center justify-center mb-2">
          <Wallet size={22} color={COLORS.primaryContainer} strokeWidth={2.2} />
        </View>
        <Text className="text-[13px] font-semibold text-on-surface text-center">
          Top Up Saldo
        </Text>
      </TouchableOpacity>

      {/* 3. Riwayat */}
      <TouchableOpacity
        className="flex-1 items-center justify-center py-3.5 px-2 rounded-card bg-surface-lowest border border-outline-variant shadow-sm active:scale-95"
        onPress={onHistoryPress}
        activeOpacity={0.75}
      >
        <View className="w-12 h-12 rounded-full bg-surface-container-high items-center justify-center mb-2">
          <Receipt size={22} color={COLORS.primaryContainer} strokeWidth={2.2} />
        </View>
        <Text className="text-[13px] font-semibold text-on-surface text-center">
          Riwayat
        </Text>
      </TouchableOpacity>
    </View>
  );
};
