import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

export function FAB({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.8}>
      <MaterialCommunityIcons name="plus" size={28} color={colors.gold} />
    </TouchableOpacity>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 28,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: colors.fabBase,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOpacity: 0.4,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
    },
  });
}
