import React from 'react';
import { View, Text } from 'react-native';
import { Zap, ShieldCheck } from 'lucide-react-native';
import { Card } from '@/core/components/Card';
import { COLORS } from '@/core/theme/tokens';

export const AuthPromoCard: React.FC = () => {
  return (
    <Card className="bg-surface-low border border-outline-variant p-4 mb-5">
      <View className="flex-row items-center mb-2">
        <View className="w-7 h-7 rounded-full bg-secondary/10 items-center justify-center mr-2.5">
          <Zap size={14} color={COLORS.secondary} />
        </View>
        <Text className="text-[13px] font-bold text-on-surface">
          Promo Transfer BI-FAST Gratis
        </Text>
      </View>
      <Text className="text-[12px] text-on-surface-variant leading-4 mb-3">
        Nikmati kuota 100x gratis transfer antar bank tanpa syarat saldo minimum setiap bulan.
      </Text>
      <View className="flex-row items-center gap-1.5 pt-2 border-t border-outline-variant">
        <ShieldCheck size={13} color={COLORS.success} />
        <Text className="text-[10px] text-on-surface-variant font-medium">
          Berizin dan diawasi oleh Otoritas Jasa Keuangan (OJK) & LPS
        </Text>
      </View>
    </Card>
  );
};
