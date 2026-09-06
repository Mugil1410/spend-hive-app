import React, { useMemo } from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';

export function Card({ style, children, ...rest }: ViewProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
  });
}
