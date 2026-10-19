import React from 'react';
import { View } from 'react-native';
import { TextInput, HelperText, TextInputProps } from 'react-native-paper';
import { useController, Control, FieldValues, Path } from 'react-hook-form';

interface FormInputProps<T extends FieldValues> extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  helperText?: string;
  className?: string;
}

export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  helperText,
  className,
  ...textInputProps
}: FormInputProps<T>) {
  const {
    field: { value, onChange, onBlur },
    fieldState: { error },
  } = useController({
    control,
    name,
  });

  const hasError = Boolean(error);

  return (
    <View className={`mb-3 ${className || ''}`}>
      <TextInput
        mode="outlined"
        label={label}
        value={value ? String(value) : ''}
        onChangeText={onChange}
        onBlur={onBlur}
        error={hasError}
        style={{ backgroundColor: '#ffffff' }}
        {...textInputProps}
      />
      {hasError ? (
        <HelperText type="error" visible={hasError}>
          {error?.message}
        </HelperText>
      ) : helperText ? (
        <HelperText type="info" visible={Boolean(helperText)}>
          {helperText}
        </HelperText>
      ) : null}
    </View>
  );
}
