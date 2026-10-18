import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  Landmark,
  ChevronDown,
  Eye,
  EyeOff,
  Copy,
  Plus,
} from 'lucide-react-native';
import { ReadyAccount } from '../hooks/use-dashboard-data';
import { COLORS } from '@/core/theme/tokens';

interface HeroAccountCardProps {
  account: ReadyAccount;
  onToggleBalance: () => void;
  onCopyRekening: () => void;
  onOpenNewAccount: () => void;
  onSelectAccount?: () => void;
}

export const HeroAccountCard: React.FC<HeroAccountCardProps> = ({
  account,
  onToggleBalance,
  onCopyRekening,
  onOpenNewAccount,
  onSelectAccount,
}) => {
  return (
    <View className="relative overflow-hidden rounded-hero bg-primary-container p-5 shadow-hero mb-4">
      {/* Ambient glowing accents */}
      <View className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-secondary-container/20" />
      <View className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-tertiary-fixed/10" />

      <View className="relative z-10 gap-3.5">
        {/* Card Sub-header */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Landmark size={18} color={COLORS.secondaryFixed} />
            <Text className="text-[13px] font-medium text-on-primary-container tracking-wide">
              {account.accountTypeLabel}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onSelectAccount}
            disabled={!onSelectAccount}
            activeOpacity={0.8}
            className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 active:bg-white/20"
          >
            <Text className="text-[11px] font-semibold text-white">
              {account.accountCountLabel}
            </Text>
            <ChevronDown size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Main Balance Display */}
        <View>
          <Text className="text-[11px] font-bold text-on-primary-container tracking-wider uppercase mb-1">
            SALDO TERSEDIA
          </Text>
          <View className="flex-row items-center justify-between">
            <Text
              className="text-[30px] font-bold text-white tracking-tight"
              numberOfLines={1}
            >
              {account.displayBalance}
            </Text>
            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-white/10 items-center justify-center active:scale-95"
              onPress={onToggleBalance}
              activeOpacity={0.8}
              accessibilityLabel={account.isBalanceVisible ? 'Sembunyikan Saldo' : 'Tampilkan Saldo'}
            >
              {account.isBalanceVisible ? (
                <Eye size={20} color="#FFFFFF" />
              ) : (
                <EyeOff size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Card Footer Actions */}
        <View className="flex-row items-center justify-between pt-1">
          <TouchableOpacity
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 active:scale-95"
            onPress={onCopyRekening}
            activeOpacity={0.8}
          >
            <Text className="text-[13px] tracking-wider font-mono text-white">
              {account.accountNumber}
            </Text>
            <Copy size={14} color="rgba(255, 255, 255, 0.75)" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center gap-1 px-3.5 py-1.5 rounded-full bg-tertiary-fixed shadow-md active:scale-95"
            onPress={onOpenNewAccount}
            activeOpacity={0.85}
          >
            <Plus size={16} color={COLORS.primary} strokeWidth={2.8} />
            <Text className="text-[13px] font-bold text-primary">
              Buka Rekening
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
