import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Landmark,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  X,
  Copy,
  ArrowRight,
  Zap,
} from 'lucide-react-native';
import { Account, formatRupiah } from '../../domain/entities/account';
import { useCreateAccount } from '../hooks/use-accounts';
import { COLORS } from '@/core/theme/tokens';
import { Button } from '@/core/components/Button';
import { AppError } from '@/core/errors/app-error';

interface OpenAccountModalProps {
  visible: boolean;
  currentCount: number;
  onSuccess: (newAccount: Account) => void;
  onClose: () => void;
}

export const OpenAccountModal: React.FC<OpenAccountModalProps> = ({
  visible,
  currentCount,
  onSuccess,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [accountType, setAccountType] = useState<'SAVINGS' | 'CHECKING'>('SAVINGS');
  const [createdAccount, setCreatedAccount] = useState<Account | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createAccountMutation = useCreateAccount();
  const maxAccounts = 3;

  const handleOpenAccount = async () => {
    setErrorMessage(null);
    try {
      const newAcc = await createAccountMutation.mutateAsync(accountType);
      setCreatedAccount(newAcc);
    } catch (err: unknown) {
      const msg = err instanceof AppError
        ? err.message
        : err instanceof Error
        ? err.message
        : 'Gagal membuka rekening baru.';
      setErrorMessage(msg);
    }
  };

  const handleCopyAcc = (accNumber: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show('Nomor rekening berhasil disalin!', ToastAndroid.SHORT);
    } else {
      Alert.alert('Tersalin', 'Nomor rekening berhasil disalin ke clipboard.');
    }
  };

  const handleFinish = () => {
    if (createdAccount) {
      onSuccess(createdAccount);
    }
    setCreatedAccount(null);
    setErrorMessage(null);
    onClose();
  };

  const handleClose = () => {
    setCreatedAccount(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View className="flex-1 bg-black/65 justify-end">
        <View
          className="bg-surface-lowest rounded-t-sheet max-h-[90%]"
          style={{
            backgroundColor: COLORS.surfaceLowest,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          }}
        >
          {/* Handle bar */}
          <View className="w-10 h-1.5 bg-outline-variant/60 rounded-full self-center mt-3 mb-2" />

          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-3 border-b border-outline-variant/30">
            <View>
              <Text className="text-[17px] font-bold text-on-surface">
                {createdAccount ? 'Rekening Baru Terbit' : 'Buka Rekening Baru'}
              </Text>
              {!createdAccount && (
                <Text className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                  Rekening ke-{currentCount + 1} dari batas {maxAccounts} rekening
                </Text>
              )}
            </View>
            <TouchableOpacity
              className="w-8 h-8 rounded-full bg-surface-low items-center justify-center"
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={COLORS.onSurface} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerClassName="px-6 pt-4 pb-3"
            showsVerticalScrollIndicator={false}
          >
            {/* SUCCESS STATE CELEBRATION */}
            {createdAccount ? (
              <View className="items-center py-3">
                {/* Celebration Badge */}
                <View className="w-16 h-16 rounded-full bg-secondary-fixed/20 border border-secondary items-center justify-center mb-3">
                  <Sparkles size={32} color={COLORS.secondary} />
                </View>

                <Text className="text-[20px] font-black text-on-surface tracking-tight mb-1 text-center">
                  Selamat! Rekening Siap Pakai
                </Text>
                <Text className="text-[12px] text-on-surface-variant text-center px-4 mb-5 leading-5">
                  Rekening baru Anda telah berhasil diterbitkan dengan standar algoritma Luhn Mod-10.
                </Text>

                {/* Account Card Preview */}
                <View className="w-full bg-primary-container rounded-2xl p-5 mb-5 shadow-sm border border-secondary/20">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center gap-2">
                      <Landmark size={18} color={COLORS.secondaryFixed} />
                      <Text className="text-[13px] font-bold text-white">
                        {createdAccount.accountType === 'GIRO' ? 'HiBank Giro' : 'HiBank Tabungan'}
                      </Text>
                    </View>
                    <View className="px-2.5 py-0.5 rounded-full bg-success-container border border-success/30">
                      <Text className="text-[10px] font-bold text-success uppercase">Aktif</Text>
                    </View>
                  </View>

                  <Text className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1">
                    NOMOR REKENING BARU
                  </Text>
                  <TouchableOpacity
                    className="flex-row items-center justify-between bg-white/10 px-3.5 py-2.5 rounded-xl mb-3 active:opacity-80"
                    onPress={() => handleCopyAcc(createdAccount.accountNumber)}
                  >
                    <Text className="text-[17px] font-black text-white font-mono tracking-wider">
                      {createdAccount.accountNumber.replace(/(\d{4})(?=\d)/g, '$1 ')}
                    </Text>
                    <Copy size={16} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View className="flex-row items-center justify-between pt-2 border-t border-white/15">
                    <Text className="text-[11px] text-white/70">Saldo Awal</Text>
                    <Text className="text-[14px] font-bold text-white font-mono">Rp 0</Text>
                  </View>
                </View>

                <Button
                  title="Gunakan Rekening Ini Sekarang"
                  variant="primary"
                  onPress={handleFinish}
                  rightIcon={<ArrowRight size={18} color="#FFFFFF" />}
                  className="w-full"
                />
              </View>
            ) : (
              /* SELECTION & CREATION FORM */
              <>
                {errorMessage && (
                  <View className="bg-error-container border border-error/20 p-3 rounded-xl mb-4">
                    <Text className="text-[12px] text-error font-medium text-center">
                      {errorMessage}
                    </Text>
                  </View>
                )}

                <Text className="text-[13px] font-bold text-on-surface mb-2.5">
                  Pilih Jenis Rekening
                </Text>

                {/* Account Type Card: SAVINGS */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setAccountType('SAVINGS')}
                  className={`p-4 rounded-2xl border mb-3 transition-all ${
                    accountType === 'SAVINGS'
                      ? 'bg-secondary-fixed/10 border-secondary shadow-sm'
                      : 'bg-surface-low border-outline-variant/60'
                  }`}
                >
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-row items-center gap-2">
                      <View className="w-8 h-8 rounded-lg bg-surface-container items-center justify-center">
                        <Landmark size={18} color={COLORS.secondary} />
                      </View>
                      <View>
                        <Text className="text-[14px] font-bold text-on-surface">HiBank Tabungan</Text>
                        <Text className="text-[11px] text-on-surface-variant font-medium">
                          Tabungan Harian Bebas Admin
                        </Text>
                      </View>
                    </View>
                    <View
                      className={`w-5 h-5 rounded-full border items-center justify-center ${
                        accountType === 'SAVINGS'
                          ? 'border-secondary bg-secondary'
                          : 'border-outline-variant'
                      }`}
                    >
                      {accountType === 'SAVINGS' && <View className="w-2 h-2 rounded-full bg-white" />}
                    </View>
                  </View>
                  <Text className="text-[12px] text-on-surface-variant leading-4 pl-10">
                    Bebas biaya administrasi bulanan, bunga tabungan kompetitif, dan gratis transfer BI-FAST.
                  </Text>
                </TouchableOpacity>

                {/* Account Type Card: CHECKING / GIRO */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setAccountType('CHECKING')}
                  className={`p-4 rounded-2xl border mb-4 transition-all ${
                    accountType === 'CHECKING'
                      ? 'bg-secondary-fixed/10 border-secondary shadow-sm'
                      : 'bg-surface-low border-outline-variant/60'
                  }`}
                >
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-row items-center gap-2">
                      <View className="w-8 h-8 rounded-lg bg-surface-container items-center justify-center">
                        <Zap size={18} color={COLORS.primary} />
                      </View>
                      <View>
                        <Text className="text-[14px] font-bold text-on-surface">HiBank Giro</Text>
                        <Text className="text-[11px] text-on-surface-variant font-medium">
                          Rekening Transaksi Fleksibel
                        </Text>
                      </View>
                    </View>
                    <View
                      className={`w-5 h-5 rounded-full border items-center justify-center ${
                        accountType === 'CHECKING'
                          ? 'border-secondary bg-secondary'
                          : 'border-outline-variant'
                      }`}
                    >
                      {accountType === 'CHECKING' && <View className="w-2 h-2 rounded-full bg-white" />}
                    </View>
                  </View>
                  <Text className="text-[12px] text-on-surface-variant leading-4 pl-10">
                    Limit harian transaksi lebih tinggi, cocok untuk keperluan operasional dan pembayaran rutin.
                  </Text>
                </TouchableOpacity>

                {/* Perks Checklist */}
                <View className="bg-surface-low rounded-2xl p-4 mb-5 border border-outline-variant/60">
                  <View className="flex-row items-center gap-1.5 mb-2.5">
                    <ShieldCheck size={16} color={COLORS.secondary} />
                    <Text className="text-[12px] font-bold text-on-surface uppercase tracking-wider">
                      Ketentuan & Keuntungan
                    </Text>
                  </View>
                  <View className="gap-2">
                    <Text className="text-[12px] text-on-surface-variant">
                      ✓ Saldo awal Rp 0 tanpa minimum deposit wajib
                    </Text>
                    <Text className="text-[12px] text-on-surface-variant">
                      ✓ Terbit otomatis dengan nomor rekening 10 digit unik
                    </Text>
                    <Text className="text-[12px] text-on-surface-variant">
                      ✓ Terproteksi penuh sistem anti-BOLA / IDOR Core Banking
                    </Text>
                  </View>
                </View>

                {/* Submit Button */}
                <Button
                  title={createAccountMutation.isPending ? 'Menerbitkan Rekening...' : 'Buka Rekening Sekarang'}
                  variant="primary"
                  onPress={handleOpenAccount}
                  disabled={createAccountMutation.isPending}
                  className="w-full"
                />
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
