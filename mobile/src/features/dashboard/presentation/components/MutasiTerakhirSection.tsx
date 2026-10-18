import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeftRight, ArrowRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { ReadyMutation } from '../hooks/use-dashboard-data';
import { COLORS } from '@/core/theme/tokens';

interface MutasiTerakhirSectionProps {
  mutations: ReadyMutation[];
  onViewAllPress: () => void;
  onItemPress?: (item: ReadyMutation) => void;
}

export const MutasiTerakhirSection: React.FC<MutasiTerakhirSectionProps> = ({
  mutations,
  onViewAllPress,
  onItemPress,
}) => {
  return (
    <View className="p-4 rounded-card bg-surface-lowest border border-outline-variant shadow-sm mb-4">
      {/* Header Row */}
      <View className="flex-row items-center justify-between pb-2">
        <View className="flex-row items-center gap-2">
          <ArrowLeftRight size={18} color={COLORS.primary} strokeWidth={2.4} />
          <Text className="text-[16px] font-bold text-on-surface tracking-tight">
            Mutasi Terakhir
          </Text>
        </View>

        <TouchableOpacity
          className="flex-row items-center gap-0.5 active:opacity-75"
          onPress={onViewAllPress}
          activeOpacity={0.7}
        >
          <Text className="text-[13px] font-semibold text-secondary">Lihat Semua</Text>
          <ArrowRight size={15} color={COLORS.secondary} />
        </TouchableOpacity>
      </View>

      {/* List of Mutation Items */}
      {mutations.length === 0 ? (
        <View className="py-6 items-center justify-center">
          <Text className="text-[13px] text-on-surface-variant font-medium">
            Belum ada transaksi mutasi
          </Text>
        </View>
      ) : (
        <View className="gap-1 mt-1">
          {mutations.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={onItemPress ? 0.75 : 1}
              onPress={() => onItemPress?.(item)}
              disabled={!onItemPress}
              className="flex-row items-center justify-between p-2 rounded-xl active:bg-surface-container-low"
            >
              {/* Left: Icon & Description */}
              <View className="flex-row items-center gap-3 flex-1 pr-2">
                <View
                  className={`w-10 h-10 rounded-full ${item.iconBgColor} items-center justify-center`}
                >
                  {item.isCredit ? (
                    <ArrowDownLeft size={18} color={item.iconColor} strokeWidth={2.4} />
                  ) : (
                    <ArrowUpRight size={18} color={item.iconColor} strokeWidth={2.4} />
                  )}
                </View>

                <View className="flex-1">
                  <Text
                    className="text-[14px] font-medium text-on-surface"
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text className="text-[12px] text-on-surface-variant mt-0.5 font-medium">
                    {item.timeLabel}
                  </Text>
                </View>
              </View>

              {/* Right: Amount & Status */}
              <View className="items-end pl-2">
                <Text className={`text-[15px] ${item.amountColor}`}>
                  {item.amountLabel}
                </Text>
                <Text className={`text-[11px] ${item.statusColor}`}>
                  {item.statusLabel}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};
