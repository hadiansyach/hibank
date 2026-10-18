import React from 'react';
import { View, Text } from 'react-native';
import { Sparkles, CheckCircle2 } from 'lucide-react-native';
import { Card } from '@/core/components/Card';
import { COLORS } from '@/core/theme/tokens';

const DEFAULT_BENEFITS = [
  'Bebas biaya transfer BI-FAST antar bank',
  'Bunga tabungan harian kompetitif hingga 4.5% p.a.',
  'Verifikasi instan tanpa perlu datang ke kantor cabang',
];

export const RegisterBenefitsCard: React.FC = () => {
  return (
    <Card className="bg-surface-low border border-outline-variant p-3.5 mb-5">
      <View className="flex-row items-center mb-2.5">
        <Sparkles size={16} color={COLORS.secondary} />
        <Text className="text-[13px] font-bold text-on-surface ml-2">
          Keuntungan Nasabah HiBank
        </Text>
      </View>
      <View className="gap-2">
        {DEFAULT_BENEFITS.map((item, idx) => (
          <View key={idx} className="flex-row items-center">
            <CheckCircle2 size={13} color={COLORS.success} />
            <Text className="text-[12px] text-on-surface-variant ml-2 flex-1 leading-4">
              {item}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
};
