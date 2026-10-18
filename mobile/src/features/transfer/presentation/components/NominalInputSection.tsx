import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card } from '@/core/components/Card';
import { Input } from '@/core/components/Input';
import { formatRupiah } from '@/features/accounts/domain/entities/account';

const PRESET_AMOUNTS = [50000, 100000, 500000, 1000000];

interface NominalInputSectionProps {
  amount: number;
  onChangeAmount: (val: number) => void;
  notes: string;
  onChangeNotes: (val: string) => void;
}

export const NominalInputSection: React.FC<NominalInputSectionProps> = ({
  amount,
  onChangeAmount,
  notes,
  onChangeNotes,
}) => {
  return (
    <Card className="p-4 mb-5">
      <Text className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
        Nominal & Catatan
      </Text>

      <Input
        label="Nominal Transfer (IDR)"
        placeholder="Rp 0"
        keyboardType="number-pad"
        value={amount > 0 ? amount.toString() : ''}
        onChangeText={(val) => {
          const num = parseInt(val.replace(/\D/g, ''), 10) || 0;
          onChangeAmount(num);
        }}
        hint="Bebas biaya transfer dengan BI-FAST (Rp 0)"
      />

      {/* Preset Chips */}
      <View className="flex-row gap-2 mb-4 -mt-1">
        {PRESET_AMOUNTS.map((val) => {
          const isActive = amount === val;
          return (
            <TouchableOpacity
              key={val}
              className={`flex-1 py-2.5 rounded-control border items-center justify-center ${
                isActive
                  ? 'bg-primary-container border-primary-container shadow-sm'
                  : 'bg-surface-low border-outline-variant'
              }`}
              onPress={() => onChangeAmount(val)}
              activeOpacity={0.8}
            >
              <Text
                className={`text-[12px] font-bold ${
                  isActive ? 'text-white' : 'text-on-surface'
                }`}
              >
                {val >= 1000000 ? `${val / 1000000} Jt` : `${val / 1000} Rb`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Input
        label="Catatan Transfer (Opsional)"
        placeholder="Contoh: Pembayaran invoice atau uang jajan"
        value={notes}
        onChangeText={onChangeNotes}
      />
    </Card>
  );
};
