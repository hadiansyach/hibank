import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CreditCard, ChevronRight } from 'lucide-react-native';
import { COLORS } from '@/core/theme/tokens';

interface PaymentGatewayOptionProps {
  onPress?: () => void;
}

export const PaymentGatewayOption: React.FC<PaymentGatewayOptionProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      className="flex-row justify-between items-center bg-surface-low border border-outline-variant p-3.5 rounded-xl mb-4"
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View className="flex-row items-center gap-3 flex-1 pr-2">
        <View className="w-10 h-10 rounded-xl bg-surface-lowest border border-outline-variant items-center justify-center">
          <CreditCard size={20} color={COLORS.secondary} />
        </View>
        <View className="flex-1">
          <Text className="text-[13px] font-bold text-on-surface">Midtrans Snap Gateway</Text>
          <Text className="text-[11px] text-on-surface-variant mt-0.5" numberOfLines={1}>
            GoPay, QRIS, Virtual Account BCA/Mandiri/BRI
          </Text>
        </View>
      </View>
      <ChevronRight size={18} color={COLORS.onSurfaceVariant} />
    </TouchableOpacity>
  );
};
