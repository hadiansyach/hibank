import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react-native';
import { ScreenContainer } from '@/core/components/ScreenContainer';
import { Input } from '@/core/components/Input';
import { Button } from '@/core/components/Button';
import { COLORS } from '@/core/theme/tokens';
import { useRegisterForm } from '../hooks/use-register-form';
import { RegisterStepBar } from '../components/RegisterStepBar';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { RegisterBenefitsCard } from '../components/RegisterBenefitsCard';
import { SecurityDiagnosticBadge } from '../components/SecurityDiagnosticBadge';

export const RegisterScreen: React.FC = () => {
  const router = useRouter();
  const {
    fullName,
    setFullName,
    email,
    setEmail,
    phone,
    setPhone,
    password,
    setPassword,
    errorMessage,
    isLoading,
    isFormValid,
    passwordStrength,
    submitRegister,
  } = useRegisterForm();

  const handleRegisterPress = () => {
    submitRegister(() => {
      Alert.alert(
        'Pendaftaran Berhasil',
        'Akun Anda telah terdaftar. Silakan masuk menggunakan kredensial Anda.',
        [{ text: 'Masuk Sekarang', onPress: () => router.replace('/(auth)/login') }]
      );
    });
  };

  return (
    <ScreenContainer backgroundColor={COLORS.canvas}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="px-5 pt-3 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Header */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-surface-lowest border border-outline-variant items-center justify-center"
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={20} color={COLORS.onSurface} />
            </TouchableOpacity>
            <Text className="text-[17px] font-bold text-on-surface">Data Diri Nasabah</Text>
            <View className="w-10" />
          </View>

          {/* Stepper & Diagnostic */}
          <View className="flex-row items-center justify-between mb-1">
            <SecurityDiagnosticBadge statusText="Local API • Ready" />
          </View>

          <RegisterStepBar currentStep={1} totalSteps={3} stepTitle="Data Diri" />

          {/* Title & Description */}
          <View className="mb-4">
            <Text className="text-[24px] font-bold text-on-surface tracking-tight mb-1">
              Buka Rekening Baru
            </Text>
            <Text className="text-[13px] text-on-surface-variant leading-5">
              Daftar dalam 3 menit. Nikmati bebas biaya transfer BI-FAST dan tabungan bunga harian.
            </Text>
          </View>

          {/* Benefits Card */}
          <RegisterBenefitsCard />

          {/* Error Message */}
          {errorMessage && (
            <View className="bg-error-container border border-error/20 p-3 rounded-xl mb-4">
              <Text className="text-[13px] text-error font-medium">{errorMessage}</Text>
            </View>
          )}

          {/* Form Fields */}
          <View className="mb-2">
            <Input
              label="Nama Lengkap Sesuai KTP"
              placeholder="Contoh: Ahmad Fadilah"
              value={fullName}
              onChangeText={setFullName}
              leftIcon={<User size={18} color={COLORS.onSurfaceVariant} />}
            />

            <Input
              label="Alamat Email Aktif"
              placeholder="nama@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              leftIcon={<Mail size={18} color={COLORS.onSurfaceVariant} />}
            />

            <Input
              label="Nomor WhatsApp / Ponsel"
              placeholder="08123456789"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              leftIcon={<Phone size={18} color={COLORS.onSurfaceVariant} />}
            />

            <Input
              label="Kata Sandi Akun"
              placeholder="Minimal 8 karakter"
              isPassword
              value={password}
              onChangeText={setPassword}
              leftIcon={<Lock size={18} color={COLORS.onSurfaceVariant} />}
            />

            {password.length > 0 && (
              <PasswordStrengthMeter
                score={passwordStrength.score}
                label={passwordStrength.label}
              />
            )}
          </View>

          {/* Submit Button */}
          <Button
            title="Lanjut Pendaftaran"
            variant="primary"
            isLoading={isLoading}
            disabled={!isFormValid}
            onPress={handleRegisterPress}
            rightIcon={<ArrowRight size={18} color="#FFFFFF" />}
            className="mb-4"
          />

          {/* Link to Login */}
          <View className="flex-row justify-center items-center gap-1.5 py-1.5 mb-5">
            <Text className="text-[13px] text-on-surface-variant">Sudah memiliki akun?</Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text className="text-[13px] font-bold text-secondary">Masuk Sekarang</Text>
            </TouchableOpacity>
          </View>

          {/* Security Assurance */}
          <View className="flex-row items-center gap-2.5 bg-surface-low p-3 rounded-xl">
            <ShieldCheck size={18} color={COLORS.success} />
            <Text className="text-[11px] text-on-surface-variant flex-1 leading-4">
              Data pribadi Anda dienkripsi dengan standar perbankan ISO/IEC 27001 dan dilindungi LPS.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};
