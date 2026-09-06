import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

export function EmptyState({ icon, message }: { icon: string; message: string }) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcons name={icon as any} size={40} color={colors.textSecondary} />
      <Text style={[typography.caption, { marginTop: 8, textAlign: 'center' }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 },
});
