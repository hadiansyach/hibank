import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CreditCard, ShieldCheck, X, Info, ArrowRight } from 'lucide-react-native';
import { ScreenContainer } from '@/core/components/ScreenContainer';
import { Card } from '@/core/components/Card';
import { Button } from '@/core/components/Button';
import { formatRupiah } from '@/features/accounts/domain/entities/account';
import { useAccounts } from '@/features/accounts/presentation/hooks/use-accounts';
import { useQueryClient } from '@tanstack/react-query';
import { ACCOUNTS_QUERY_KEY } from '@/features/accounts/presentation/hooks/use-accounts';
import { COLORS } from '@/core/theme/tokens';
import { TopupChipsGrid } from '../components/TopupChipsGrid';
import { PaymentGatewayOption } from '../components/PaymentGatewayOption';

export const TopupScreen: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: accounts } = useAccounts();

  const primaryAccount = accounts && accounts.length > 0 ? accounts[0] : null;

  const [selectedAmount, setSelectedAmount] = useState<number>(500000);
  const [isLoading, setIsLoading] = useState(false);

  const handleTopup = async () => {
    if (!primaryAccount) {
      Alert.alert(
        'Rekening Tidak Ditemukan',
        'Silakan buka rekening tabungan terlebih dahulu sebelum melakukan isi saldo.'
      );
      return;
    }

    if (!selectedAmount || selectedAmount < 10000) {
      Alert.alert('Nominal Tidak Valid', 'Nominal top up minimal Rp 10.000.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      Alert.alert(
        'Top Up Berhasil Diproses',
        `Saldo sebesar ${formatRupiah(selectedAmount)} berhasil ditambahkan ke rekening Anda via Midtrans Snap.`,
        [{ text: 'Selesai', onPress: () => router.replace('/(tabs)') }]
      );
    }, 1200);
  };

  return (
    <ScreenContainer backgroundColor={COLORS.canvas}>
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-surface-lowest border border-outline-variant items-center justify-center"
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text className="text-[17px] font-bold text-on-surface">Isi Saldo Rekening</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        contentContainerClassName="px-5 pt-2 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <Card className="p-5">
          {/* Section Header with Midtrans Snap Badge */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-lg bg-surface-container items-center justify-center">
                <CreditCard size={18} color={COLORS.secondary} />
              </View>
              <Text className="text-[15px] font-bold text-on-surface">Top Up Saldo</Text>
            </View>

            <View className="flex-row items-center gap-1.5 bg-secondary-fixed px-2.5 py-1 rounded-full">
              <View className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <Text className="text-[11px] font-bold text-secondary">Midtrans Snap</Text>
            </View>
          </View>

          {/* Target Account Info */}
          <View className="flex-row justify-between items-center bg-surface-low p-3 rounded-xl mb-4 border border-outline-variant">
            <View className="flex-row items-center gap-2.5">
              <View className="w-9 h-9 rounded-full bg-primary-container items-center justify-center">
                <Text className="text-[12px] font-extrabold text-white">HI</Text>
              </View>
              <View>
                <Text className="text-[13px] font-bold text-on-surface">Hi-Tabungan Utama</Text>
                <Text className="text-[11px] text-on-surface-variant font-mono">
                  {primaryAccount?.accountNumber || 'Belum Ada Rekening'}
                </Text>
              </View>
            </View>
            <Text className="text-[14px] font-extrabold text-on-surface">
              {formatRupiah(primaryAccount?.balance || 0)}
            </Text>
          </View>

          {/* Nominal Quick Selection Chips */}
          <TopupChipsGrid
            selectedAmount={selectedAmount}
            onSelectAmount={setSelectedAmount}
          />

          {/* Custom Nominal Display Box */}
          <View className="flex-row justify-between items-center bg-surface-low border border-outline-variant px-4 py-3.5 rounded-xl mb-3">
            <View>
              <Text className="text-[11px] font-semibold text-on-surface-variant">Nominal Pengisian</Text>
              <Text className="text-[24px] font-black text-primary-container tracking-tight mt-0.5">
                {formatRupiah(selectedAmount)}
              </Text>
            </View>
            <TouchableOpacity
              className="w-8 h-8 rounded-full bg-surface-container items-center justify-center"
              onPress={() => setSelectedAmount(50000)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={COLORS.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center gap-1.5 px-1 mb-4">
            <Info size={13} color={COLORS.secondary} />
            <Text className="text-[11px] text-on-surface-variant flex-1">
              Minimal transaksi Rp 10.000, maksimal Rp 20.000.000 per sesi.
            </Text>
          </View>

          {/* Payment Gateway Option Card */}
          <PaymentGatewayOption />

          {/* Verification Banner */}
          <View className="flex-row items-center gap-2.5 bg-surface-container p-3 rounded-xl mb-5">
            <ShieldCheck size={20} color={COLORS.success} />
            <View className="flex-1">
              <Text className="text-[12px] font-bold text-on-surface">Terverifikasi Otomatis</Text>
              <Text className="text-[11px] text-on-surface-variant leading-4 mt-0.5">
                Metode pembayaran resmi Midtrans dengan enkripsi perbankan 256-bit.
              </Text>
            </View>
          </View>

          {/* Primary Submit CTA */}
          <Button
            title="Lanjut Bayar (Midtrans Snap)"
            onPress={handleTopup}
            isLoading={isLoading}
            rightIcon={<ArrowRight size={18} color="#FFFFFF" />}
          />
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
};
