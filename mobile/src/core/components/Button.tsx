import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { COLORS } from '../theme/tokens';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'outline' | 'danger' | 'ghost';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'normal' | 'sm';
  className?: string;
  textClassName?: string;
}

const variantConfig: Record<
  ButtonVariant,
  { container: string; text: string; loaderColor: string }
> = {
  primary: {
    container: 'bg-primary-container shadow-sm',
    text: 'text-white',
    loaderColor: '#FFFFFF',
  },
  accent: {
    container: 'bg-tertiary-fixed shadow-sm',
    text: 'text-on-tertiary-fixed',
    loaderColor: COLORS.primaryContainer,
  },
  secondary: {
    container: 'bg-surface-container',
    text: 'text-secondary',
    loaderColor: COLORS.secondary,
  },
  outline: {
    container: 'bg-surface-lowest border border-outline-variant shadow-sm',
    text: 'text-on-surface',
    loaderColor: COLORS.secondary,
  },
  danger: {
    container: 'bg-error shadow-sm',
    text: 'text-white',
    loaderColor: '#FFFFFF',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-secondary',
    loaderColor: COLORS.secondary,
  },
};

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  isLoading = false,
  leftIcon,
  rightIcon,
  size = 'normal',
  disabled,
  className = '',
  textClassName = '',
  style,
  ...props
}) => {
  const isDisabled = disabled || isLoading;
  const config = variantConfig[variant] || variantConfig.primary;

  const sizeClasses =
    size === 'sm' ? 'h-10 px-3.5 rounded-control' : 'h-[52px] px-5 rounded-control';
  const textSizeClasses = size === 'sm' ? 'text-[13px] font-semibold' : 'text-[15px] font-bold';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      className={`items-center justify-center flex-row ${sizeClasses} ${config.container} ${
        isDisabled ? 'opacity-50' : ''
      } ${className}`}
      style={style}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={config.loaderColor} />
      ) : (
        <View className="flex-row items-center justify-center">
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text
            className={`tracking-tight ${textSizeClasses} ${config.text} ${textClassName}`}
          >
            {title}
          </Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};
