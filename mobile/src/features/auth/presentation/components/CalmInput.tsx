import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { useController, Control, FieldValues, Path } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';

interface CalmInputProps<T extends FieldValues> extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  helperText?: string;
  className?: string;
}

export function CalmInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  leftIcon,
  isPassword = false,
  helperText,
  className = '',
  ...inputProps
}: CalmInputProps<T>) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    field: { value, onChange, onBlur },
    fieldState: { error },
  } = useController({
    control,
    name,
  });

  const hasError = Boolean(error);

  return (
    <View className={`mb-4 ${className}`}>
      {/* Field Label */}
      <View className="flex-row justify-between items-center mb-1.5">
        <Text className="text-xs font-semibold text-[#282734] tracking-tight">
          {label}
        </Text>
      </View>

      {/* Input Container: Static Tailwind className with inline style for dynamic focus/error to avoid NativeWind CSS-variable upgrade warnings */}
      <View
        className="flex-row items-center px-4 h-[52px] rounded-xl bg-white"
        style={{
          borderWidth: hasError || isFocused ? 2 : 1,
          borderColor: hasError ? '#BA1A1A' : isFocused ? '#6654D9' : '#E5E2E9',
          backgroundColor: hasError ? '#FFFBFB' : '#FFFFFF',
        }}
      >
        {/* Left Icon */}
        {leftIcon && (
          <View className="mr-3 items-center justify-center">
            <Ionicons
              name={leftIcon}
              size={19}
              color={hasError ? '#BA1A1A' : isFocused ? '#6654D9' : '#747280'}
            />
          </View>
        )}

        {/* Text Input */}
        <TextInput
          value={value ? String(value) : ''}
          onChangeText={onChange}
          onFocus={(e) => {
            setIsFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur();
            inputProps.onBlur?.(e);
          }}
          placeholder={placeholder}
          placeholderTextColor="#747280"
          secureTextEntry={isPassword && !showPassword}
          className="flex-1 text-[#282734] text-[15px] font-normal py-0 h-full"
          autoCapitalize="none"
          {...inputProps}
        />

        {/* Password Visibility Toggle */}
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="p-1 items-center justify-center"
            accessibilityLabel={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          >
            <Ionicons
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="#747280"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Validation Error Banner */}
      {hasError ? (
        <View className="flex-row items-center mt-1.5 px-2.5 py-1 rounded-md bg-[#F7E9E8] self-start">
          <Ionicons name="alert-circle" size={13} color="#B85358" />
          <Text className="text-[12px] font-medium text-[#B85358] ml-1">
            {error?.message}
          </Text>
        </View>
      ) : helperText ? (
        <Text className="text-[11px] text-[#747280] mt-1 px-1">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}
