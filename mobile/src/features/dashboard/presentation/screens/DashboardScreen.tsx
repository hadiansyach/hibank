import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth';

export function DashboardScreen() {
  const { user, logout } = useAuth();
  const [showBalance, setShowBalance] = useState(true);

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'Ihsan';

  return (
    <SafeAreaView className="flex-1 bg-[#FAF9F6]">
      {/* Top Fixed Header */}
      <View className="h-16 px-5 flex-row items-center justify-between border-b border-[#E5E2E9]/60 bg-[#FAF9F6]/90">
        <View className="flex-row items-center space-x-2.5">
          <View className="w-9 h-9 rounded-xl bg-[#6654D9] items-center justify-center mr-2 shadow-xs">
            <Text className="text-white font-bold text-lg leading-none">H</Text>
          </View>
          <View>
            <Text className="text-[17px] font-bold text-[#282734] tracking-tight leading-none">
              HiBank
            </Text>
            <Text className="text-[11px] font-medium text-[#747280] mt-0.5 leading-none">
              Beranda
            </Text>
          </View>
        </View>

        <View className="flex-row items-center space-x-2">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-[#EFEDF3] items-center justify-center mr-2 active:bg-[#E5E2E9]"
            accessibilityLabel="Notifikasi"
          >
            <Ionicons name="notifications-outline" size={19} color="#282734" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={logout}
            className="w-9 h-9 rounded-full bg-[#6654D9] items-center justify-center shadow-xs"
            accessibilityLabel="Keluar"
          >
            <Ionicons name="log-out-outline" size={17} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting & Editorial Headline */}
        <View className="flex-row items-center justify-between mb-5">
          <View>
            <Text className="text-[24px] font-bold text-[#282734] tracking-tight">
              Selamat datang, {firstName}
            </Text>
            <Text className="text-[13px] text-[#747280] mt-0.5">
              Kelola keuangan dengan tenang dan teratur
            </Text>
          </View>
          <View className="w-10 h-10 rounded-2xl bg-[#EFEDF3] items-center justify-center">
            <Ionicons name="leaf-outline" size={20} color="#6654D9" />
          </View>
        </View>

        {/* Elevated Balance Presentation Hero Card */}
        <View className="bg-white rounded-3xl p-6 border border-[#E5E2E9] shadow-xs mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center space-x-2">
              <Text className="text-[13px] font-semibold text-[#747280] mr-2">
                Saldo Utama
              </Text>
              <TouchableOpacity
                onPress={() => setShowBalance(!showBalance)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showBalance ? 'eye-outline' : 'eye-off-outline'}
                  size={17}
                  color="#747280"
                />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center px-2.5 py-1 rounded-full bg-[#E8F1EA]">
              <Ionicons name="trending-up" size={13} color="#367A5A" />
              <Text className="text-[11px] font-semibold text-[#367A5A] ml-1">
                +Rp2.450.000 bulan ini
              </Text>
            </View>
          </View>

          {/* Prominent Currency Display */}
          <Text className="text-[32px] font-bold text-[#282734] tracking-tight my-2">
            {showBalance ? 'Rp 48.750.000' : '••••••••••••'}
          </Text>

          {/* Asymmetric Soft Lavender Account Capsule */}
          <View className="mt-4 p-4 rounded-2xl bg-[#EAE7FB]/70 border border-[#E4DFFF]/60 flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3">
              <View className="w-9 h-9 rounded-xl bg-white items-center justify-center mr-3 shadow-xs">
                <Ionicons name="wallet-outline" size={19} color="#6654D9" />
              </View>
              <View>
                <Text className="text-[13px] font-bold text-[#282734]">
                  Tabungan Utama HiBank
                </Text>
                <Text className="text-[12px] text-[#747280] tracking-wider mt-0.5">
                  •••• 8291
                </Text>
              </View>
            </View>

            <View className="px-2.5 py-1 rounded-md bg-white shadow-xs">
              <Text className="text-[11px] font-semibold text-[#6654D9]">
                Bebas Biaya
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Action Hub */}
        <View className="flex-row space-x-3 mb-6">
          {/* Primary CTA: Kirim Uang */}
          <TouchableOpacity
            className="flex-1 bg-[#6654D9] rounded-2xl p-4 h-24 justify-between shadow-xs active:bg-[#5142B5] mr-2.5"
            activeOpacity={0.85}
          >
            <View className="flex-row justify-between items-start">
              <View className="w-8 h-8 rounded-lg bg-white/20 items-center justify-center">
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </View>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
            <View>
              <Text className="text-white font-bold text-[15px] leading-tight">
                Kirim Uang
              </Text>
              <Text className="text-[#ECE7FF] text-[11px] mt-0.5">
                Antar bank instan
              </Text>
            </View>
          </TouchableOpacity>

          {/* Secondary Actions */}
          <View className="flex-1 space-y-2 justify-between">
            <TouchableOpacity className="h-[44px] bg-white rounded-xl px-3 flex-row items-center justify-between border border-[#E5E2E9] shadow-xs active:bg-[#EFEDF3]">
              <View className="flex-row items-center space-x-2">
                <Ionicons name="arrow-down-circle-outline" size={18} color="#6654D9" />
                <Text className="text-[13px] font-semibold text-[#282734] ml-2">
                  Minta Dana
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#747280" />
            </TouchableOpacity>

            <TouchableOpacity className="h-[44px] bg-white rounded-xl px-3 flex-row items-center justify-between border border-[#E5E2E9] shadow-xs active:bg-[#EFEDF3]">
              <View className="flex-row items-center space-x-2">
                <Ionicons name="add-circle-outline" size={18} color="#6654D9" />
                <Text className="text-[13px] font-semibold text-[#282734] ml-2">
                  Buka Rekening
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#747280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Capacity Indicator */}
        <View className="bg-white rounded-2xl p-4 border border-[#E5E2E9] shadow-xs mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center space-x-2">
              <Ionicons name="pie-chart-outline" size={16} color="#747280" />
              <Text className="text-[13px] font-semibold text-[#282734] ml-1.5">
                Kapasitas Rekening
              </Text>
            </View>
            <Text className="text-[11px] font-semibold text-[#747280]">
              2 dari 3 Aktif
            </Text>
          </View>

          {/* Segmented subtle progress bar */}
          <View className="flex-row space-x-1.5 h-1.5 w-full my-2">
            <View className="flex-1 bg-[#6654D9] rounded-full mr-1" />
            <View className="flex-1 bg-[#6654D9] rounded-full mr-1" />
            <View className="flex-1 bg-[#EFEDF3] rounded-full" />
          </View>
          <Text className="text-[11px] text-[#747280] mt-1">
            Tersedia 1 slot untuk pos simpanan terencana
          </Text>
        </View>

        {/* Transaction History Section */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-[16px] font-bold text-[#282734]">
            Catatan Transaksi
          </Text>
          <TouchableOpacity>
            <Text className="text-[12px] font-semibold text-[#6654D9]">
              Lihat Semua
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transaction Rows */}
        <View className="bg-white rounded-2xl p-3 border border-[#E5E2E9] shadow-xs space-y-3">
          {[
            {
              title: 'Gaji Pokok & Bonus',
              subtitle: 'PT Inovasi Finansial • 09:30',
              amount: '+Rp 12.500.000',
              isInflow: true,
              icon: 'arrow-down',
            },
            {
              title: 'Kedai Kopi Tenang',
              subtitle: 'Debit Instan QRIS • 07:15',
              amount: '-Rp 45.000',
              isInflow: false,
              icon: 'cafe-outline',
            },
            {
              title: 'Tagihan Listrik Rumah',
              subtitle: 'Pembayaran Otomatis • Kemarin',
              amount: '-Rp 250.000',
              isInflow: false,
              icon: 'flash-outline',
            },
          ].map((item, index) => (
            <View
              key={index}
              className={`flex-row items-center justify-between py-2.5 ${
                index !== 0 ? 'border-t border-[#E5E2E9]/60' : ''
              }`}
            >
              <View className="flex-row items-center space-x-3">
                <View
                  className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
                    item.isInflow ? 'bg-[#E8F1EA]' : 'bg-[#EFEDF3]'
                  }`}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={18}
                    color={item.isInflow ? '#367A5A' : '#515060'}
                  />
                </View>
                <View>
                  <Text className="text-[13px] font-bold text-[#282734]">
                    {item.title}
                  </Text>
                  <Text className="text-[11px] text-[#747280] mt-0.5">
                    {item.subtitle}
                  </Text>
                </View>
              </View>

              <View className="items-end">
                <Text
                  className={`text-[13px] font-bold ${
                    item.isInflow ? 'text-[#367A5A]' : 'text-[#282734]'
                  }`}
                >
                  {item.amount}
                </Text>
                <Text className="text-[10px] text-[#747280] mt-0.5">Berhasil</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={logout}
          className="mt-6 h-[46px] rounded-xl border border-[#F7E9E8] bg-[#F7E9E8]/60 items-center justify-center active:bg-[#ffdad6]"
          activeOpacity={0.8}
        >
          <Text className="text-[13px] font-semibold text-[#BA1A1A]">
            Keluar dari Akun
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
