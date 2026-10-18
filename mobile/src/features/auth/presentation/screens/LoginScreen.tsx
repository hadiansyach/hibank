import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Mail,
  Lock,
  ArrowRight,
  Fingerprint,
  AlertCircle,
  X,
  Check,
} from 'lucide-react-native';
import { ScreenContainer } from '@/core/components/ScreenContainer';
import { Input } from '@/core/components/Input';
import { Button } from '@/core/components/Button';
import { Card } from '@/core/components/Card';
import { COLORS } from '@/core/theme/tokens';
import { useLoginForm } from '../hooks/use-login-form';
import { SecurityDiagnosticBadge } from '../components/SecurityDiagnosticBadge';
import { AuthPromoCard } from '../components/AuthPromoCard';

export const LoginScreen: React.FC = () => {
  const router = useRouter();
  const {
    email,
    setEmail,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    errorMessage,
    setErrorMessage,
    isLoading,
    isBiometricEnabled,
    handleLogin,
    handleBiometricAuth,
  } = useLoginForm();

  const onLoginPress = () => {
    handleLogin(() => router.replace('/(tabs)'));
  };

  const onBiometricPress = () => {
    handleBiometricAuth(() => router.replace('/(tabs)'));
  };

  return (
    <ScreenContainer backgroundColor={COLORS.canvas}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="px-5 pt-4 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Brand & Diagnostic */}
          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-row items-center gap-2.5">
              <View className="w-9 h-9 rounded-xl bg-primary-container items-center justify-center">
                <Text className="text-[18px] font-black text-white">H</Text>
              </View>
              <View>
                <Text className="text-[18px] font-black tracking-tight text-on-surface">HiBank</Text>
                <Text className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">
                  Enterprise Mobile
                </Text>
              </View>
            </View>

            <SecurityDiagnosticBadge statusText="Local API • DB Ready" />
          </View>

          {/* Dismissible Error Banner */}
          {errorMessage && (
            <View className="flex-row items-start justify-between bg-error-container border border-error/20 p-3.5 rounded-xl mb-4">
              <View className="flex-row items-start gap-2.5 flex-1 pr-2">
                <AlertCircle size={18} color={COLORS.error} className="mt-0.5" />
                <View className="flex-1">
                  <Text className="text-[13px] font-bold text-error">Gagal Melakukan Autentikasi</Text>
                  <Text className="text-[12px] text-error leading-4 mt-0.5">{errorMessage}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setErrorMessage(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          )}

          {/* Login Form Card */}
          <Card className="p-5 mb-5">
            <View className="mb-5">
              <Text className="text-[20px] font-bold text-on-surface tracking-tight mb-1">
                Selamat Datang Kembali
              </Text>
              <Text className="text-[13px] text-on-surface-variant leading-5">
                Akses dompet giro, tabungan valas, dan transfer instan.
              </Text>
            </View>

            {/* Email Field */}
            <Input
              label="Alamat Email Nasabah"
              placeholder="nama@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              leftIcon={<Mail size={18} color={COLORS.onSurfaceVariant} />}
            />

            {/* Password Field */}
            <Input
              label="Kata Sandi Akun"
              placeholder="••••••••"
              isPassword
              value={password}
              onChangeText={setPassword}
              leftIcon={<Lock size={18} color={COLORS.onSurfaceVariant} />}
            />

            {/* Options Row: Remember Me & Forgot Password */}
            <View className="flex-row justify-between items-center mt-1 mb-5">
              <TouchableOpacity
                className="flex-row items-center gap-2"
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.8}
              >
                <View
                  className={`w-4 h-4 rounded border items-center justify-center ${
                    rememberMe ? 'bg-secondary border-secondary' : 'bg-surface-low border-outline-variant'
                  }`}
                >
                  {rememberMe && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <Text className="text-[12px] font-medium text-on-surface-variant">Ingat Saya</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setErrorMessage('Silakan hubungi administrator bank untuk reset sandi.')}>
                <Text className="text-[12px] font-semibold text-secondary">Lupa Sandi?</Text>
              </TouchableOpacity>
            </View>

            {/* Main Login CTA */}
            <Button
              title="Masuk ke Akun"
              variant="primary"
              isLoading={isLoading}
              onPress={onLoginPress}
              rightIcon={<ArrowRight size={18} color="#FFFFFF" />}
              className="mb-3"
            />

            {/* Biometric CTA */}
            {isBiometricEnabled && (
              <Button
                title="Masuk dengan Biometrik"
                variant="outline"
                leftIcon={<Fingerprint size={18} color={COLORS.secondary} />}
                onPress={onBiometricPress}
              />
            )}
          </Card>

          {/* Promo Card */}
          <AuthPromoCard />

          {/* Footer Register Link */}
          <View className="flex-row justify-center items-center gap-1.5 py-2">
            <Text className="text-[13px] text-on-surface-variant">Belum memiliki akun nasabah?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text className="text-[13px] font-bold text-secondary">Buka Rekening Baru</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};
