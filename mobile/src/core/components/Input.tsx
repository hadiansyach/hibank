import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { COLORS } from '../theme/tokens';

interface InputProps extends TextInputProps {
  label: string;
  subLabel?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  isPassword?: boolean;
  className?: string;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  subLabel,
  error,
  hint,
  leftIcon,
  rightElement,
  isPassword = false,
  className = '',
  containerClassName = '',
  style,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`mb-3.5 ${containerClassName}`}>
      <View className="flex-row justify-between items-center mb-1.5">
        <Text className="text-[13px] font-semibold text-on-surface">{label}</Text>
        {subLabel && <Text className="text-[12px] font-semibold text-secondary">{subLabel}</Text>}
      </View>

      <View
        className={`flex-row items-center h-[50px] border rounded-control px-3.5 ${
          error
            ? 'border-error bg-error-container'
            : isFocused
            ? 'border-secondary border-[1.5px] bg-surface-lowest'
            : 'border-outline-variant bg-surface-low'
        }`}
      >
        {leftIcon && <View className="mr-2.5 items-center justify-center">{leftIcon}</View>}
        <TextInput
          placeholderTextColor={COLORS.onSurfaceVariant}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`flex-1 h-full text-[14px] font-medium text-on-surface ${className}`}
          style={style}
          {...props}
        />
        {isPassword ? (
          <TouchableOpacity
            className="p-1.5"
            onPress={() => setShowPassword(!showPassword)}
            accessibilityLabel={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
          >
            {showPassword ? (
              <EyeOff size={18} color={COLORS.onSurfaceVariant} />
            ) : (
              <Eye size={18} color={COLORS.onSurfaceVariant} />
            )}
          </TouchableOpacity>
        ) : (
          rightElement && <View className="ml-1.5 items-center justify-center">{rightElement}</View>
        )}
      </View>

      {error ? (
        <Text className="text-error text-[12px] mt-1 ml-0.5 font-medium">{error}</Text>
      ) : hint ? (
        <Text className="text-on-surface-variant text-[12px] mt-1 ml-0.5">{hint}</Text>
      ) : null}
    </View>
  );
};
