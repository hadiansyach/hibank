import React from 'react';
import { View, Text } from 'react-native';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border?: string }> = {
  success: { bg: 'bg-success-container', text: 'text-success' },
  warning: { bg: 'bg-warning-container', text: 'text-warning' },
  danger: { bg: 'bg-error-container', text: 'text-error' },
  accent: { bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed' },
  neutral: { bg: 'bg-surface-low', text: 'text-on-surface-variant', border: 'border border-outline-variant' },
  info: { bg: 'bg-surface-container', text: 'text-secondary' },
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'info',
  icon,
  className = '',
}) => {
  const current = variantStyles[variant] || variantStyles.info;

  return (
    <View
      className={`px-2.5 py-0.5 rounded-full self-start flex-row items-center ${current.bg} ${
        current.border || ''
      } ${className}`}
    >
      {icon && <View className="mr-1">{icon}</View>}
      <Text className={`text-[11px] font-bold tracking-tight ${current.text}`}>{label}</Text>
    </View>
  );
};
