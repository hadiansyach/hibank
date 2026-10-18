import React, { useState } from 'react';
import { View, Text, Switch, ScrollView, Alert } from 'react-native';
import {
  Shield,
  Fingerprint,
  Clock,
  Smartphone,
  ChevronRight,
  ShieldCheck,
  KeyRound,
  Power,
} from 'lucide-react-native';
import { ScreenContainer } from '@/core/components/ScreenContainer';
import { Card } from '@/core/components/Card';
import { Button } from '@/core/components/Button';
import { useAuthStore } from '@/features/auth/presentation/state/auth-store';
import { COLORS } from '@/core/theme/tokens';
import { ProfileHeaderCard } from '../components/ProfileHeaderCard';
import { SecuritySettingItem } from '../components/SecuritySettingItem';
import { PinEditorModal } from '../components/PinEditorModal';

export const ProfileScreen: React.FC = () => {
  const {
    user,
    logout,
    updatePin,
    isBiometricSupported,
    isBiometricEnabled,
    enableBiometrics,
  } = useAuthStore();

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [inactivityLock, setInactivityLock] = useState(true);
  const [screenShieldEnabled, setScreenShieldEnabled] = useState(true);

  const handleToggleBiometrics = async (val: boolean) => {
    if (val) {
      await enableBiometrics();
    } else {
      Alert.alert(
        'Nonaktifkan Biometrik',
        'Anda harus memasukkan kata sandi setiap kali login jika biometrik dinonaktifkan.'
      );
    }
  };

  const handleSavePin = async (newPin: string, oldPin?: string) => {
    await updatePin(newPin, oldPin);
    setIsPinModalOpen(false);
    Alert.alert(
      'PIN Berhasil Diperbarui',
      'PIN 6-digit baru Anda telah aktif untuk otorisasi transaksi.'
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Konfirmasi Keluar',
      'Apakah Anda yakin ingin mengakhiri sesi perbankan ini?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Keluar', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  return (
    <ScreenContainer backgroundColor={COLORS.canvas}>
      {/* Top Header */}
      <View className="px-5 pt-3 pb-2">
        <Text className="text-[20px] font-bold text-on-surface">Profil & Keamanan</Text>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pt-2 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Header */}
        <ProfileHeaderCard user={user} />

        {/* Security Settings Section */}
        <Text className="text-[14px] font-bold text-on-surface tracking-tight mb-2.5">
          Keamanan Transaksi & Sesi
        </Text>
        <Card className="p-4 mb-5">
          {/* PIN Action Item */}
          <SecuritySettingItem
            icon={<KeyRound size={20} color={COLORS.primaryContainer} />}
            title={user?.hasPin ? 'Ubah 6-Digit PIN' : 'Buat 6-Digit PIN'}
            description={
              user?.hasPin
                ? 'Otorisasi transfer & transaksi finansial'
                : 'Belum diatur • Wajib untuk transfer'
            }
            onPress={() => setIsPinModalOpen(true)}
            rightElement={
              <View className="flex-row items-center gap-1">
                <Text className="text-[12px] font-bold text-secondary">
                  {user?.hasPin ? 'Ubah' : 'Buat'}
                </Text>
                <ChevronRight size={16} color={COLORS.secondary} />
              </View>
            }
          />

          {/* Biometrics Toggle */}
          <SecuritySettingItem
            icon={<Fingerprint size={20} color={COLORS.secondary} />}
            title="Login Biometrik (Face / Touch ID)"
            description={
              isBiometricSupported
                ? 'Otorisasi instan dengan sensor perangkat'
                : 'Perangkat tidak mendukung biometrik'
            }
            rightElement={
              <Switch
                value={isBiometricEnabled}
                onValueChange={handleToggleBiometrics}
                disabled={!isBiometricSupported}
                trackColor={{ false: COLORS.outlineVariant, true: COLORS.secondary }}
                thumbColor="#FFFFFF"
              />
            }
          />

          {/* Inactivity Lock */}
          <SecuritySettingItem
            icon={<Clock size={20} color={COLORS.warning} />}
            title="Kunci Inaktivitas Otomatis"
            description="Kunci aplikasi otomatis setelah 5 menit idle"
            rightElement={
              <Switch
                value={inactivityLock}
                onValueChange={setInactivityLock}
                trackColor={{ false: COLORS.outlineVariant, true: COLORS.secondary }}
                thumbColor="#FFFFFF"
              />
            }
          />

          {/* Screen Shield */}
          <SecuritySettingItem
            icon={<Shield size={20} color={COLORS.success} />}
            title="Screen Shield (Anti-Screenshot)"
            description="Cegah perekaman layar pada ringkasan rekening"
            showDivider={false}
            rightElement={
              <Switch
                value={screenShieldEnabled}
                onValueChange={setScreenShieldEnabled}
                trackColor={{ false: COLORS.outlineVariant, true: COLORS.secondary }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </Card>

        {/* Device Information */}
        <Text className="text-[14px] font-bold text-on-surface tracking-tight mb-2.5">
          Integritas Perangkat
        </Text>
        <Card className="p-4 mb-6">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-success-container items-center justify-center">
              <Smartphone size={20} color={COLORS.success} />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-bold text-on-surface">Hardware KeyStore Aktif</Text>
              <Text className="text-[11px] text-on-surface-variant mt-0.5">
                Kunci sesi terproteksi hardware enclave OS
              </Text>
            </View>
            <ShieldCheck size={18} color={COLORS.success} />
          </View>
        </Card>

        {/* Logout Button */}
        <Button
          title="Keluar dari Akun"
          variant="danger"
          leftIcon={<Power size={18} color="#FFFFFF" />}
          onPress={handleLogout}
        />
      </ScrollView>

      {/* PIN Change Modal */}
      <PinEditorModal
        visible={isPinModalOpen}
        hasExistingPin={!!user?.hasPin}
        onClose={() => setIsPinModalOpen(false)}
        onSave={handleSavePin}
      />
    </ScreenContainer>
  );
};
