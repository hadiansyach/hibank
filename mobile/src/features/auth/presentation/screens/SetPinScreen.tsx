import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthNavigationProp, AuthStackParamList } from '@/core/navigation/types';
import { PinPad } from '../components/PinPad';
import { AuthHeader } from '../components/AuthHeader';
import { hashPinUseCase, authRepository } from '../../data';
import { useSetPinMutation } from '../hooks/useSetPinMutation';
import { useAuthStore } from '../controllers/useAuthStore';

type SetPinRouteProp = RouteProp<AuthStackParamList, 'SetPin'>;

export function SetPinScreen() {
  const route = useRoute<SetPinRouteProp>();
  const navigation = useNavigation<AuthNavigationProp>();
  const email = route.params?.email || 'user@hibank.com';

  const [pin, setPin] = useState('');
  const [computedRawHash, setComputedRawHash] = useState<string | null>(null);
  const [computedSalt, setComputedSalt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const setPinMutation = useSetPinMutation();

  const handleComputeHash = () => {
    try {
      const result = hashPinUseCase.execute(pin);
      setComputedRawHash(result.rawHashHex);
      setComputedSalt(result.saltHex);
      setMessage('Hash Argon2id (raw hex tanpa prefix/suffix) berhasil dibuat!');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'PIN tidak valid';
      setMessage(errorMsg);
    }
  };

  const handleSubmitPin = () => {
    if (pin.length !== 6) {
      setMessage('PIN harus terdiri dari 6 digit angka');
      return;
    }

    setPinMutation.mutate(
      { pin },
      {
        onSuccess: async (data) => {
          setComputedRawHash(data.clientRawHashHex);
          setMessage('PIN transaksi berhasil disimpan! Membuka Beranda...');
          const session = await authRepository.getCurrentSession();
          setTimeout(() => {
            if (session) {
              useAuthStore.getState().setSession(session);
            } else {
              navigation.navigate('Login');
            }
          }, 1200);
        },
        onError: (err) => {
          setMessage(err.message);
        },
      }
    );
  };

  const handleSkip = async () => {
    const session = await authRepository.getCurrentSession();
    if (session) {
      useAuthStore.getState().setSession(session);
    } else {
      navigation.navigate('Login');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAF9F6]">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader
          onBack={() => navigation.navigate('Login')}
          subtitle="Keamanan Transaksi"
          stepIndicator="Langkah 2 dari 2"
        />

        {/* Progress Bar */}
        <View className="flex-row space-x-2 my-2 w-full">
          <View className="flex-1 h-1.5 rounded-full bg-[#6654D9] mr-2" />
          <View className="flex-1 h-1.5 rounded-full bg-[#6654D9]" />
        </View>

        {/* Account Info Pill */}
        <View className="flex-row items-center justify-between p-3.5 my-3 rounded-2xl bg-white border border-[#E5E2E9] shadow-xs">
          <View className="flex-row items-center space-x-3">
            <View className="w-10 h-10 rounded-xl bg-[#EAE7FB] items-center justify-center mr-3">
              <Ionicons name="person" size={20} color="#6654D9" />
            </View>
            <View>
              <Text className="text-[11px] font-semibold text-[#747280]">
                Akun Terdaftar
              </Text>
              <Text className="text-[14px] font-bold text-[#282734]">
                {email}
              </Text>
            </View>
          </View>
          <View className="px-2.5 py-1 rounded-full bg-[#E8F1EA]">
            <Text className="text-[11px] font-semibold text-[#367A5A]">Terverifikasi</Text>
          </View>
        </View>

        {/* Heading */}
        <View className="items-center my-3">
          <Text className="text-[24px] font-bold text-[#282734] tracking-tight">
            Buat PIN Transaksi
          </Text>
          <Text className="text-[13px] text-[#747280] mt-1 text-center leading-relaxed">
            PIN 6-digit digunakan untuk otorisasi transfer dan pembayaran.
          </Text>
        </View>

        {/* PinPad */}
        <PinPad pin={pin} maxLength={6} onPinChange={setPin} disabled={setPinMutation.isPending} />

        {/* Action Buttons */}
        <View className="w-full max-w-[320px] mx-auto mt-4 space-y-2.5">
          <TouchableOpacity
            onPress={handleSubmitPin}
            disabled={pin.length !== 6 || setPinMutation.isPending}
            className={`h-[50px] rounded-xl items-center justify-center mb-2.5 ${
              pin.length === 6 && !setPinMutation.isPending
                ? 'bg-[#6654D9] active:bg-[#5142B5]'
                : 'bg-[#C9C4D6]'
            }`}
            activeOpacity={0.85}
          >
            {setPinMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-white font-semibold text-[15px]">
                Simpan & Aktifkan PIN
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleComputeHash}
            disabled={pin.length !== 6 || setPinMutation.isPending}
            className="h-[46px] rounded-xl border border-[#E5E2E9] bg-white items-center justify-center active:bg-[#EFEDF3] mb-2"
          >
            <Text className="text-[13px] font-semibold text-[#6654D9]">
              Inspeksi Raw Argon2id Hash (Tanpa Prefix/Suffix)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSkip}
            disabled={setPinMutation.isPending}
            className="h-[38px] items-center justify-center"
            activeOpacity={0.7}
          >
            <Text className="text-[13px] font-medium text-[#747280]">
              Lewati dan Buat PIN Nanti
            </Text>
          </TouchableOpacity>
        </View>

        {/* Argon2id Inspection Card */}
        {computedRawHash && (
          <View className="mt-6 p-4 rounded-2xl bg-[#EFEDF3] border border-[#E5E2E9]">
            <View className="flex-row items-center mb-2">
              <Ionicons name="key-outline" size={16} color="#6654D9" />
              <Text className="text-[12px] font-bold text-[#282734] ml-1.5">
                Output Argon2id Raw Hex Digest (64 Karakter)
              </Text>
            </View>
            <Text className="text-[11px] font-mono text-[#282734] bg-white p-2.5 rounded-lg border border-[#E5E2E9] mb-2 select-all">
              {computedRawHash}
            </Text>
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={13} color="#367A5A" />
              <Text className="text-[11px] font-medium text-[#367A5A] ml-1">
                Terverifikasi: Tanpa prefix ($argon2id$...) dan tanpa suffix
              </Text>
            </View>
          </View>
        )}

        {/* Notification Toast */}
        {message && (
          <View className="mt-4 p-3 rounded-xl bg-white border border-[#E5E2E9] shadow-xs">
            <Text className="text-[12px] font-medium text-[#282734] text-center">
              {message}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
