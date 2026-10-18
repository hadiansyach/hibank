import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lock } from 'lucide-react-native';
import { Input } from '@/core/components/Input';
import { Button } from '@/core/components/Button';
import { COLORS } from '@/core/theme/tokens';

interface PinEditorModalProps {
  visible: boolean;
  hasExistingPin?: boolean;
  onClose: () => void;
  onSave: (newPin: string, oldPin?: string) => Promise<void> | void;
}

export const PinEditorModal: React.FC<PinEditorModalProps> = ({
  visible,
  hasExistingPin = false,
  onClose,
  onSave,
}) => {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const handleSave = async () => {
    setErrorMessage(null);

    if (hasExistingPin && oldPin.length !== 6) {
      setErrorMessage('PIN saat ini harus berupa 6 digit angka.');
      return;
    }
    if (newPin.length !== 6) {
      setErrorMessage('PIN baru harus berupa 6 digit angka.');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMessage('Konfirmasi PIN tidak sesuai dengan PIN baru.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(newPin, hasExistingPin ? oldPin : undefined);
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      setErrorMessage(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui PIN transaksi.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setErrorMessage(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View
          className="bg-surface-lowest rounded-t-sheet p-6"
          style={{
            backgroundColor: COLORS.surfaceLowest,
            paddingBottom: Math.max(insets.bottom, 20) + 12,
          }}
        >
          <View className="w-10 h-1 bg-outline-variant rounded-full self-center mb-4" />

          <View className="items-center mb-4">
            <View className="w-12 h-12 rounded-full bg-surface-container items-center justify-center mb-2.5">
              <Lock size={22} color={COLORS.secondary} />
            </View>
            <Text className="text-[18px] font-bold text-on-surface">
              {hasExistingPin ? 'Ubah 6-Digit PIN' : 'Buat 6-Digit PIN Transaksi'}
            </Text>
            <Text className="text-[12px] text-on-surface-variant text-center mt-1">
              PIN digunakan untuk otorisasi transaksi transfer dan finansial Anda.
            </Text>
          </View>

          {errorMessage && (
            <View className="bg-error-container border border-error/20 p-3 rounded-xl mb-3">
              <Text className="text-[12px] text-error font-medium text-center">{errorMessage}</Text>
            </View>
          )}

          {hasExistingPin && (
            <Input
              label="PIN Saat Ini (6 Digit)"
              placeholder="Ketik 6 angka PIN lama"
              keyboardType="number-pad"
              maxLength={6}
              isPassword
              value={oldPin}
              onChangeText={(val) => {
                setOldPin(val);
                setErrorMessage(null);
              }}
            />
          )}

          <Input
            label="PIN Baru (6 Digit)"
            placeholder="Ketik 6 angka"
            keyboardType="number-pad"
            maxLength={6}
            isPassword
            value={newPin}
            onChangeText={(val) => {
              setNewPin(val);
              setErrorMessage(null);
            }}
          />

          <Input
            label="Konfirmasi PIN Baru"
            placeholder="Ulangi 6 angka"
            keyboardType="number-pad"
            maxLength={6}
            isPassword
            value={confirmPin}
            onChangeText={(val) => {
              setConfirmPin(val);
              setErrorMessage(null);
            }}
          />

          <Button
            title={hasExistingPin ? 'Simpan PIN Baru' : 'Aktifkan PIN Transaksi'}
            variant="primary"
            onPress={handleSave}
            isLoading={isSubmitting}
            className="mt-2 mb-3"
          />

          <TouchableOpacity className="h-10 items-center justify-center" onPress={handleClose}>
            <Text className="text-[13px] font-semibold text-on-surface-variant">Batal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
