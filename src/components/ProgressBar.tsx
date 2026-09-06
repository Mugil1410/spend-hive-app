import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export function ProgressBar({ percent, color, height = 8 }: { percent: number; color: string; height?: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: color, borderRadius: height / 2 }]} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    track: {
      width: '100%',
      backgroundColor: colors.separator,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
    },
  });
}
