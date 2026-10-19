import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthNavigationProp } from '@/core/navigation/types';
import { CalmInput } from '../components/CalmInput';
import { AuthHeader } from '../components/AuthHeader';
import { registerValidationSchema, RegisterFormValues } from '../../utils/authValidators';
import { useRegisterMutation } from '../hooks/useRegisterMutation';

export function RegisterScreen() {
  const navigation = useNavigation<AuthNavigationProp>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const { control, handleSubmit, watch } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerValidationSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const currentPassword = watch('password') || '';
  const hasMinLength = currentPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(currentPassword);
  const hasNumber = /[0-9]/.test(currentPassword);

  const registerMutation = useRegisterMutation();

  const onSubmit = (values: RegisterFormValues) => {
    if (!agreeTerms) {
      setErrorMessage('Anda harus menyetujui Syarat & Ketentuan untuk melanjutkan.');
      return;
    }

    setErrorMessage(null);
    registerMutation.mutate(
      {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
      },
      {
        onSuccess: (user) => {
          navigation.navigate('SetPin', { email: user.email, userId: user.id });
        },
        onError: (error) => {
          setErrorMessage(error.message);
        },
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAF9F6]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 36 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Navigation Header */}
          <AuthHeader
            onBack={() => navigation.navigate('Login')}
            subtitle="Pendaftaran Akun"
            stepIndicator="Langkah 1 dari 2"
          />

          {/* Calm Segmented Progress Bar */}
          <View className="flex-row space-x-2 my-2 w-full">
            <View className="flex-1 h-1.5 rounded-full bg-[#6654D9] mr-2" />
            <View className="flex-1 h-1.5 rounded-full bg-[#EFEDF3]" />
          </View>

          {/* Hero Editorial Heading */}
          <View className="mt-3 mb-5">
            <Text className="text-[26px] font-bold text-[#282734] tracking-tight leading-tight">
              Buka Rekening Baru
            </Text>
            <Text className="text-[14px] text-[#747280] mt-1 leading-relaxed">
              Nikmati kebebasan bertransaksi instan tanpa potongan biaya admin.
            </Text>

            {/* Value Proposition Strip */}
            <View className="mt-3.5 p-3 rounded-2xl bg-[#EAE7FB]/70 border border-[#E4DFFF] flex-row items-center justify-between">
              <View className="flex-row items-center space-x-2">
                <Ionicons name="gift-outline" size={17} color="#6654D9" />
                <Text className="text-[12px] font-semibold text-[#6654D9] ml-1.5">
                  Bebas Biaya Transfer & Bunga 4.5% p.a
                </Text>
              </View>
              <View className="px-2 py-0.5 rounded-md bg-white shadow-xs">
                <Text className="text-[10px] font-bold text-[#6654D9]">GRATIS</Text>
              </View>
            </View>
          </View>

          {/* Server Error Alert */}
          {errorMessage && (
            <View className="flex-row items-center mb-5 p-3.5 rounded-2xl bg-[#F7E9E8] border border-[#ffdad6]">
              <Ionicons name="alert-circle" size={18} color="#B85358" />
              <Text className="text-[13px] text-[#B85358] font-medium ml-2.5 flex-1">
                {errorMessage}
              </Text>
              <TouchableOpacity onPress={() => setErrorMessage(null)}>
                <Ionicons name="close" size={16} color="#B85358" />
              </TouchableOpacity>
            </View>
          )}

          {/* Elevated Registration Card */}
          <View className="bg-white rounded-3xl p-6 border border-[#E5E2E9] shadow-sm mb-6">
            <CalmInput
              control={control}
              name="fullName"
              label="Nama Lengkap"
              placeholder="Sesuai nama pada KTP"
              leftIcon="person-outline"
              autoCapitalize="words"
            />

            <CalmInput
              control={control}
              name="email"
              label="Alamat Email"
              placeholder="nama@email.com"
              leftIcon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <CalmInput
              control={control}
              name="phone"
              label="Nomor Handphone"
              placeholder="081234567890"
              leftIcon="call-outline"
              keyboardType="phone-pad"
            />

            <CalmInput
              control={control}
              name="password"
              label="Kata Sandi"
              placeholder="Buat kata sandi yang kuat"
              leftIcon="lock-closed-outline"
              isPassword
              autoCapitalize="none"
            />

            {/* Password Strength Requirement Pills */}
            <View className="flex-row flex-wrap gap-1.5 mb-4 px-1">
              {[
                { label: '8+ Karakter', valid: hasMinLength },
                { label: 'Huruf Besar (A-Z)', valid: hasUpperCase },
                { label: 'Angka (0-9)', valid: hasNumber },
              ].map((req) => (
                <View
                  key={req.label}
                  className={`flex-row items-center px-2.5 py-1 rounded-full ${
                    req.valid ? 'bg-[#E8F1EA]' : 'bg-[#EFEDF3]'
                  }`}
                >
                  <Ionicons
                    name={req.valid ? 'checkmark-circle' : 'ellipse-outline'}
                    size={12}
                    color={req.valid ? '#367A5A' : '#747280'}
                  />
                  <Text
                    className={`text-[11px] font-medium ml-1 ${
                      req.valid ? 'text-[#367A5A]' : 'text-[#747280]'
                    }`}
                  >
                    {req.label}
                  </Text>
                </View>
              ))}
            </View>

            <CalmInput
              control={control}
              name="confirmPassword"
              label="Konfirmasi Kata Sandi"
              placeholder="Ulangi kata sandi Anda"
              leftIcon="shield-checkmark-outline"
              isPassword
              autoCapitalize="none"
            />

            {/* Terms and Conditions Checkbox */}
            <TouchableOpacity
              onPress={() => setAgreeTerms(!agreeTerms)}
              className="flex-row items-start mt-2 mb-6"
              activeOpacity={0.8}
            >
              <View
                className={`w-5 h-5 rounded-md items-center justify-center mr-3 mt-0.5 border ${
                  agreeTerms
                    ? 'bg-[#6654D9] border-[#6654D9]'
                    : 'bg-white border-[#E5E2E9]'
                }`}
              >
                {agreeTerms && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
              </View>
              <Text className="flex-1 text-[12px] text-[#747280] leading-relaxed">
                Saya menyetujui{' '}
                <Text className="text-[#6654D9] font-semibold">Syarat & Ketentuan</Text> serta{' '}
                <Text className="text-[#6654D9] font-semibold">Kebijakan Privasi</Text> PT Bank Multiplatform Indonesia.
              </Text>
            </TouchableOpacity>

            {/* Primary Action Button */}
            <TouchableOpacity
              onPress={() => handleSubmit(onSubmit)()}
              disabled={registerMutation.isPending}
              className={`h-[52px] rounded-xl items-center justify-center ${
                registerMutation.isPending ? 'bg-[#5142B5]' : 'bg-[#6654D9] active:bg-[#5142B5]'
              }`}
              activeOpacity={0.85}
            >
              {registerMutation.isPending ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text className="text-white font-semibold text-[15px] ml-2">
                    Mendaftarkan Akun...
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-white font-semibold text-[15px] tracking-wide">
                    Lanjutkan ke Otorisasi PIN
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" className="ml-1.5" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Login Switcher */}
          <View className="flex-row justify-center items-center py-2 mb-6">
            <Text className="text-[14px] text-[#747280]">
              Sudah memiliki akun HiBank?{' '}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-[14px] font-bold text-[#6654D9]">
                Masuk di Sini
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Footnote */}
          <View className="items-center justify-center pt-2">
            <View className="flex-row items-center">
              <Ionicons name="lock-closed" size={13} color="#9A98A6" />
              <Text className="text-[11px] text-[#9A98A6] ml-1">
                Data pribadi Anda dienkripsi sesuai standar keamanan perbankan ISO 27001
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
