import React from 'react';
import { View, Text } from 'react-native';
import { Wallet } from 'lucide-react-native';
import { Card } from '@/core/components/Card';
import { Account, formatRupiah } from '@/features/accounts/domain/entities/account';

interface SourceAccountCardProps {
  account: Account | null;
}

export const SourceAccountCard: React.FC<SourceAccountCardProps> = ({ account }) => {
  return (
    <Card className="flex-row items-center p-4 mb-4">
      <View className="w-11 h-11 rounded-xl bg-primary-container items-center justify-center mr-3.5">
        <Wallet size={20} color="#FFFFFF" />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2 mb-0.5">
          <Text className="text-[13px] font-bold text-on-surface">Tabungan Utama</Text>
          <View className="bg-surface-low px-1.5 py-0.5 rounded">
            <Text className="text-[10px] font-bold text-on-surface-variant">IDR</Text>
          </View>
        </View>
        <Text className="text-[12px] text-on-surface-variant font-mono mb-1">
          {account?.accountNumber || '1092 8839 20'}
        </Text>
        <Text className="text-[15px] font-extrabold text-on-surface">
          {formatRupiah(account?.balance || 0)}
        </Text>
      </View>
    </Card>
  );
};
