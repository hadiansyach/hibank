import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Landmark,
  CheckCircle2,
  Copy,
  Plus,
  X,
  CreditCard,
  Sparkles,
} from 'lucide-react-native';
import { Account, formatRupiah } from '../../domain/entities/account';
import { COLORS } from '@/core/theme/tokens';
import { Button } from '@/core/components/Button';

interface AccountSwitcherSheetProps {
  visible: boolean;
  accounts: Account[];
  selectedAccountId: string | null;
  isBalanceVisible?: boolean;
  onSelectAccount: (account: Account) => void;
  onOpenNewAccount: () => void;
  onClose: () => void;
}

export const AccountSwitcherSheet: React.FC<AccountSwitcherSheetProps> = ({
  visible,
  accounts,
  selectedAccountId,
  isBalanceVisible = true,
  onSelectAccount,
  onOpenNewAccount,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const maxAccounts = 3;
  const isQuotaFull = accounts.length >= maxAccounts;

  const handleCopy = (accNumber: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show('Nomor rekening disalin!', ToastAndroid.SHORT);
    } else {
      Alert.alert('Tersalin', 'Nomor rekening disalin ke clipboard.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/65 justify-end">
        <View
          className="bg-surface-lowest rounded-t-sheet max-h-[85%]"
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
              <Text className="text-[17px] font-bold text-on-surface">Pilih Rekening Aktif</Text>
              <Text className="text-[11px] text-on-surface-variant font-medium mt-0.5">
                {accounts.length} dari {maxAccounts} slot rekening terdaftar
              </Text>
            </View>
            <TouchableOpacity
              className="w-8 h-8 rounded-full bg-surface-low items-center justify-center"
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={COLORS.onSurface} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerClassName="px-6 pt-4 pb-2"
            showsVerticalScrollIndicator={false}
          >
            {/* Account Cards List */}
            <View className="gap-3 mb-5">
              {accounts.map((acc, index) => {
                const isSelected = selectedAccountId
                  ? acc.id === selectedAccountId
                  : index === 0;

                const formattedNumber = acc.accountNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
                const typeLabel = acc.accountType === 'GIRO' ? 'HiBank Giro' : 'HiBank Tabungan';

                return (
                  <TouchableOpacity
                    key={acc.id}
                    activeOpacity={0.85}
                    onPress={() => {
                      onSelectAccount(acc);
                      onClose();
                    }}
                    className={`p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-primary-container border-secondary shadow-sm'
                        : 'bg-surface-low border-outline-variant/60'
                    }`}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center gap-2">
                        <View
                          className={`w-7 h-7 rounded-lg items-center justify-center ${
                            isSelected ? 'bg-white/15' : 'bg-surface-container'
                          }`}
                        >
                          <Landmark
                            size={15}
                            color={isSelected ? COLORS.secondaryFixed : COLORS.primary}
                          />
                        </View>
                        <Text
                          className={`text-[13px] font-bold ${
                            isSelected ? 'text-white' : 'text-on-surface'
                          }`}
                        >
                          {typeLabel}
                        </Text>
                      </View>

                      {isSelected ? (
                        <View className="flex-row items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-fixed/20 border border-secondary/30">
                          <CheckCircle2 size={12} color={COLORS.secondaryFixed} strokeWidth={2.5} />
                          <Text className="text-[10px] font-bold text-secondaryFixed uppercase">
                            Aktif
                          </Text>
                        </View>
                      ) : (
                        <View className="w-5 h-5 rounded-full border border-outline-variant items-center justify-center" />
                      )}
                    </View>

                    {/* Balance */}
                    <Text
                      className={`text-[20px] font-black font-mono tracking-tight mb-2 ${
                        isSelected ? 'text-white' : 'text-on-surface'
                      }`}
                    >
                      {isBalanceVisible ? formatRupiah(acc.balance) : '••••••••••••'}
                    </Text>

                    {/* Account Number & Copy */}
                    <View className="flex-row items-center justify-between pt-2 border-t border-outline-variant/20">
                      <TouchableOpacity
                        className="flex-row items-center gap-1.5"
                        onPress={() => handleCopy(acc.accountNumber)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Text
                          className={`text-[12px] font-mono tracking-wider ${
                            isSelected ? 'text-white/80' : 'text-on-surface-variant'
                          }`}
                        >
                          {formattedNumber}
                        </Text>
                        <Copy
                          size={12}
                          color={isSelected ? 'rgba(255,255,255,0.7)' : COLORS.onSurfaceVariant}
                        />
                      </TouchableOpacity>

                      <Text
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          acc.status === 'active' ? 'text-success' : 'text-warning'
                        }`}
                      >
                        {acc.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quota Action Button */}
            {isQuotaFull ? (
              <View className="p-3.5 rounded-xl bg-surface-low border border-outline-variant/60 items-center justify-center">
                <Text className="text-[12px] font-medium text-on-surface-variant text-center">
                  Anda telah mencapai batas maksimal 3 rekening tabungan aktif.
                </Text>
              </View>
            ) : (
              <Button
                title={`Buka Rekening Baru (${accounts.length}/${maxAccounts})`}
                variant="outline"
                onPress={() => {
                  onClose();
                  onOpenNewAccount();
                }}
                leftIcon={<Plus size={16} color={COLORS.secondary} strokeWidth={2.6} />}
                className="w-full"
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
