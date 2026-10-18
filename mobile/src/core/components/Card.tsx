import React from 'react';
import { View, ViewProps, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../theme/tokens';

interface CardProps extends ViewProps {
  elevated?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  className = '',
  elevated = true,
  ...props
}) => {
  return (
    <View
      className={`bg-surface-lowest rounded-card p-4 border border-outline-variant ${className}`}
      style={[
        styles.base,
        elevated ? styles.elevated : null,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.surfaceLowest,
    borderColor: COLORS.outlineVariant,
  },
  elevated: Platform.select({
    ios: {
      shadowColor: '#172B4D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
});
