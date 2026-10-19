import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PinPadProps {
  pin: string;
  maxLength?: number;
  onPinChange: (newPin: string) => void;
  disabled?: boolean;
}

const PAD_DATA = [
  { num: '1', sub: '' },
  { num: '2', sub: 'ABC' },
  { num: '3', sub: 'DEF' },
  { num: '4', sub: 'GHI' },
  { num: '5', sub: 'JKL' },
  { num: '6', sub: 'MNO' },
  { num: '7', sub: 'PQRS' },
  { num: '8', sub: 'TUV' },
  { num: '9', sub: 'WXYZ' },
  { num: 'shield', sub: '' },
  { num: '0', sub: '' },
  { num: 'backspace', sub: '' },
];

export function PinPad({ pin, maxLength = 6, onPinChange, disabled = false }: PinPadProps) {
  const handlePressNumber = (num: string) => {
    if (disabled || pin.length >= maxLength) return;
    onPinChange(pin + num);
  };

  const handleBackspace = () => {
    if (disabled || pin.length === 0) return;
    onPinChange(pin.slice(0, -1));
  };

  return (
    <View className="items-center w-full max-w-[320px] mx-auto">
      {/* 6 Dots Indicator */}
      <View className="flex-row justify-center space-x-3 mb-6">
        {Array.from({ length: maxLength }).map((_, i) => {
          const filled = i < pin.length;
          return (
            <View
              key={i}
              className="w-3.5 h-3.5 rounded-full mx-1.5"
              style={{
                backgroundColor: filled ? '#6654D9' : '#EFEDF3',
                borderWidth: filled ? 0 : 1,
                borderColor: '#E5E2E9',
              }}
            />
          );
        })}
      </View>

      {/* Info Pill */}
      <View className="flex-row items-center px-4 py-2 rounded-full bg-[#EFEDF3] mb-8">
        <Ionicons name="shield-checkmark" size={15} color="#6654D9" />
        <Text className="text-[12px] text-[#747280] font-medium ml-2">
          PIN transaksi menjaga keamanan dana Anda
        </Text>
      </View>

      {/* Numeric Grid Matching Calm Confidence UI */}
      <View className="flex-row flex-wrap justify-between w-full">
        {PAD_DATA.map((item, index) => {
          if (item.num === 'shield') {
            return (
              <View
                key={index}
                className="w-[30%] h-[68px] items-center justify-center mb-3"
              >
                <Ionicons name="finger-print-outline" size={26} color="#6654D9" />
              </View>
            );
          }

          if (item.num === 'backspace') {
            return (
              <TouchableOpacity
                key={index}
                onPress={handleBackspace}
                disabled={disabled || pin.length === 0}
                className="w-[30%] h-[68px] items-center justify-center mb-3 rounded-2xl active:bg-[#EFEDF3]"
                activeOpacity={0.7}
                accessibilityLabel="Hapus angka"
              >
                <Ionicons
                  name="backspace-outline"
                  size={24}
                  color={pin.length > 0 ? '#282734' : '#C9C4D6'}
                />
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={index}
              onPress={() => handlePressNumber(item.num)}
              disabled={disabled}
              className="w-[30%] h-[68px] rounded-2xl bg-white border border-[#E5E2E9]/80 shadow-xs items-center justify-center mb-3 active:bg-[#EFEDF3]"
              activeOpacity={0.7}
            >
              <Text className="text-[22px] font-bold text-[#282734] leading-tight">
                {item.num}
              </Text>
              {item.sub ? (
                <Text className="text-[9px] font-semibold text-[#747280] tracking-wider mt-0.5">
                  {item.sub}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
