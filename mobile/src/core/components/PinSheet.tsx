import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lock, Delete, Fingerprint, Shield } from 'lucide-react-native';
import { COLORS } from '../theme/tokens';

export interface PinSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: React.ReactNode;
  onComplete: (pin: string) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  onBiometricPress?: () => void;
  isBiometricAvailable?: boolean;
}

export const PinSheet: React.FC<PinSheetProps> = ({
  visible,
  onClose,
  title = 'Masukkan 6 Digit PIN',
  subtitle,
  onComplete,
  isLoading = false,
  errorMessage = null,
  onBiometricPress,
  isBiometricAvailable = false,
}) => {
  const [pin, setPin] = useState('');
  const insets = useSafeAreaInsets();

  // Reset PIN when modal opens or closes
  useEffect(() => {
    if (!visible) {
      setPin('');
    }
  }, [visible]);

  const handleDigit = (digit: string) => {
    if (isLoading || pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 6) {
      onComplete(newPin);
    }
  };

  const handleBackspace = () => {
    if (isLoading || pin.length === 0) return;
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-end">
        <View
          className="bg-surface-lowest rounded-t-sheet px-6 pt-3"
          style={{
            backgroundColor: COLORS.surfaceLowest,
            paddingBottom: Math.max(insets.bottom, 20) + 12,
          }}
        >
          {/* Grab Handle */}
          <View className="w-10 h-1 bg-outline-variant rounded-full self-center mb-4" />

          {/* Header */}
          <View className="items-center mb-6">
            <View className="w-12 h-12 rounded-full bg-surface-container items-center justify-center mb-3">
              <Lock size={22} color={COLORS.secondary} strokeWidth={2.4} />
            </View>
            <Text className="text-[18px] font-bold text-on-surface mb-1.5">{title}</Text>
            {typeof subtitle === 'string' ? (
              <Text className="text-[13px] text-on-surface-variant text-center px-4 leading-5">
                {subtitle}
              </Text>
            ) : (
              subtitle
            )}
            {errorMessage ? (
              <Text className="text-[12px] text-error font-medium mt-2 text-center">
                {errorMessage}
              </Text>
            ) : null}
          </View>

          {/* 6 Dots */}
          <View className="flex-row justify-center gap-3.5 mb-7">
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const isFilled = index < pin.length;
              return (
                <View
                  key={index}
                  className={`w-3.5 h-3.5 rounded-full border ${
                    isFilled
                      ? 'bg-primary-container border-primary-container scale-110'
                      : 'bg-surface-low border-outline-variant'
                  }`}
                />
              );
            })}
          </View>

          {/* Keypad */}
          {isLoading ? (
            <View className="h-[280px] items-center justify-center">
              <ActivityIndicator size="large" color={COLORS.secondary} />
              <Text className="text-[13px] text-on-surface-variant mt-3 font-medium">
                Mengotorisasi transaksi...
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between w-full max-w-[280px] self-center gap-y-3.5 mb-6">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <TouchableOpacity
                  key={digit}
                  className="w-[72px] h-[72px] rounded-full bg-surface-low border border-outline-variant items-center justify-center active:bg-surface-container"
                  onPress={() => handleDigit(digit)}
                  activeOpacity={0.7}
                >
                  <Text className="text-[22px] font-bold text-on-surface">{digit}</Text>
                </TouchableOpacity>
              ))}

              {/* Biometric */}
              <TouchableOpacity
                className="w-[72px] h-[72px] rounded-full bg-surface-low border border-outline-variant items-center justify-center"
                onPress={onBiometricPress}
                disabled={!isBiometricAvailable}
                activeOpacity={0.7}
              >
                <Fingerprint
                  size={24}
                  color={isBiometricAvailable ? COLORS.secondary : COLORS.outline}
                />
              </TouchableOpacity>

              {/* 0 */}
              <TouchableOpacity
                className="w-[72px] h-[72px] rounded-full bg-surface-low border border-outline-variant items-center justify-center active:bg-surface-container"
                onPress={() => handleDigit('0')}
                activeOpacity={0.7}
              >
                <Text className="text-[22px] font-bold text-on-surface">0</Text>
              </TouchableOpacity>

              {/* Backspace */}
              <TouchableOpacity
                className="w-[72px] h-[72px] rounded-full bg-surface-low border border-outline-variant items-center justify-center active:bg-surface-container"
                onPress={handleBackspace}
                activeOpacity={0.7}
              >
                <Delete size={20} color={COLORS.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          )}

          {/* Footer Security */}
          <View className="flex-row items-center justify-center gap-1.5 mb-3">
            <Shield size={13} color={COLORS.secondary} />
            <Text className="text-[10px] text-on-surface-variant font-medium">
              Protected by Idempotency-Key & End-to-End Encryption
            </Text>
          </View>

          {/* Cancel */}
          <TouchableOpacity
            className="h-10 items-center justify-center"
            onPress={onClose}
            disabled={isLoading}
          >
            <Text className="text-[13px] font-semibold text-on-surface-variant">Batal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
