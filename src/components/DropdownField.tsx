import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  value?: string;
  placeholder: string;
  icon?: string;
  color?: string;
  onPress: () => void;
}

export function DropdownField({ value, placeholder, icon, color, onPress }: Props) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors);
  return (
    <TouchableOpacity style={styles.fieldRow} onPress={onPress}>
      <View style={styles.fieldRowLeft}>
        {icon && color ? <CategoryIcon icon={icon} color={color} size={28} /> : null}
        <Text
          style={[typography.body, !value && { color: colors.textSecondary }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {value ?? placeholder}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingVertical: 10,
      paddingHorizontal: 10,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fieldRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 },
  });
}
