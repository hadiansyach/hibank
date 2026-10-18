import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, PlusCircle, ChevronRight } from 'lucide-react-native';
import { Card } from '@/core/components/Card';
import { Badge } from '@/core/components/Badge';
import { TransactionItem } from '../../domain/entities/transaction';
import { formatRupiah } from '@/features/accounts/domain/entities/account';
import { COLORS } from '@/core/theme/tokens';

interface TransactionCardItemProps {
  item: TransactionItem;
  onPress?: () => void;
}

export const TransactionCardItem: React.FC<TransactionCardItemProps> = ({ item, onPress }) => {
  const isCredit = item.type === 'TRANSFER_IN' || item.type === 'TOPUP';

  const renderIcon = () => {
    switch (item.type) {
      case 'TRANSFER_IN':
        return (
          <View className="w-11 h-11 rounded-full bg-success-container items-center justify-center mr-3">
            <ArrowDownLeft size={20} color={COLORS.success} strokeWidth={2.4} />
          </View>
        );
      case 'TOPUP':
        return (
          <View className="w-11 h-11 rounded-full bg-secondary-fixed items-center justify-center mr-3">
            <PlusCircle size={20} color={COLORS.secondary} strokeWidth={2.4} />
          </View>
        );
      case 'TRANSFER_OUT':
      default:
        return (
          <View className="w-11 h-11 rounded-full bg-surface-low border border-outline-variant items-center justify-center mr-3">
            <ArrowUpRight size={20} color={COLORS.primaryContainer} strokeWidth={2.4} />
          </View>
        );
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.75 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <Card className="p-4 mb-3 active:scale-[0.99]">
      <View className="flex-row items-center">
        {renderIcon()}
        <View className="flex-1 pr-2">
          <Text className="text-[14px] font-bold text-on-surface" numberOfLines={1}>
            {item.title}
          </Text>
          <Text className="text-[12px] text-on-surface-variant mt-0.5" numberOfLines={1}>
            {item.subtitle}
          </Text>
          <Text className="text-[11px] text-on-surface-variant/75 mt-1 font-mono">
            {new Date(item.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <View className="items-end justify-center">
          <Text
            className={`text-[14px] font-bold font-mono tracking-tight ${
              isCredit ? 'text-success' : 'text-on-surface'
            }`}
          >
            {isCredit ? '+' : '-'} {formatRupiah(item.amount)}
          </Text>
          <View className="mt-1.5">
            <Badge
              label={item.status}
              variant={item.status === 'SUCCESS' ? 'success' : 'warning'}
            />
          </View>
        </View>
      </View>
    </Card>
  </TouchableOpacity>
  );
};
