import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ShieldAlert, ArrowRight, Lock } from 'lucide-react-native';
import { COLORS } from '@/core/theme/tokens';

interface SecurityPinAlertBannerProps {
  onSetupPin: () => void;
}

export const SecurityPinAlertBanner: React.FC<SecurityPinAlertBannerProps> = ({ onSetupPin }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onSetupPin}
      className="bg-warning-container/40 border border-warning/40 rounded-2xl p-4 mb-4 shadow-sm"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-start gap-3 flex-1 pr-2">
          <View className="w-10 h-10 rounded-xl bg-warning/15 items-center justify-center mt-0.5 border border-warning/20">
            <ShieldAlert size={22} color={COLORS.warning} strokeWidth={2.4} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5 mb-0.5">
              <Text className="text-[14px] font-bold text-on-surface">
                PIN Transaksi Belum Aktif
              </Text>
              <View className="px-2 py-0.5 rounded-full bg-warning/20">
                <Text className="text-[10px] font-bold text-warning uppercase">Wajib</Text>
              </View>
            </View>
            <Text className="text-[12px] text-on-surface-variant leading-4">
              Buat 6 digit PIN untuk mengamankan akun dan mengaktifkan transfer dana Anda.
            </Text>
          </View>
        </View>

        <View className="w-8 h-8 rounded-full bg-surface-lowest items-center justify-center border border-outline-variant/60 shadow-sm">
          <ArrowRight size={16} color={COLORS.onSurface} strokeWidth={2.4} />
        </View>
      </View>
    </TouchableOpacity>
  );
};
