import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'outline' | 'solid';
  style?: ViewStyle;
}

export function PillButton({ label, onPress, variant = 'outline', style }: Props) {
  const isSolid = variant === 'solid';
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity
      style={[styles.base, isSolid ? styles.solid : styles.outline, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, isSolid && styles.textSolid]}>{label}</Text>
    </TouchableOpacity>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    base: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    outline: { borderWidth: 1, borderColor: colors.gold, backgroundColor: 'transparent' },
    solid: { backgroundColor: colors.gold },
    text: { color: colors.gold, fontWeight: '700', fontSize: 14 },
    textSolid: { color: colors.background },
  });
}
