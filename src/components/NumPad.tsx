import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';

type KeyVariant = 'digit' | 'func' | 'op' | 'equals';

interface KeyDef {
  key: string;
  label?: string;
  icon?: string;
  span: number;
  variant: KeyVariant;
}

const ROWS: KeyDef[][] = [
  [
    { key: 'C', label: 'C', span: 2, variant: 'func' },
    { key: 'DEL', icon: 'backspace-outline', span: 1, variant: 'func' },
    { key: '÷', label: '÷', span: 1, variant: 'op' },
  ],
  [
    { key: '7', label: '7', span: 1, variant: 'digit' },
    { key: '8', label: '8', span: 1, variant: 'digit' },
    { key: '9', label: '9', span: 1, variant: 'digit' },
    { key: '×', label: '×', span: 1, variant: 'op' },
  ],
  [
    { key: '4', label: '4', span: 1, variant: 'digit' },
    { key: '5', label: '5', span: 1, variant: 'digit' },
    { key: '6', label: '6', span: 1, variant: 'digit' },
    { key: '-', label: '−', span: 1, variant: 'op' },
  ],
  [
    { key: '1', label: '1', span: 1, variant: 'digit' },
    { key: '2', label: '2', span: 1, variant: 'digit' },
    { key: '3', label: '3', span: 1, variant: 'digit' },
    { key: '+', label: '+', span: 1, variant: 'op' },
  ],
  [
    { key: '0', label: '0', span: 2, variant: 'digit' },
    { key: '.', label: '.', span: 1, variant: 'digit' },
    { key: '=', label: '=', span: 1, variant: 'equals' },
  ],
];

export function NumPad({ onKeyPress }: { onKeyPress: (key: string) => void }) {
  const { colors } = useTheme();
  const VARIANT_STYLES: Record<KeyVariant, { button: object; text: object }> = useMemo(
    () => ({
      digit: { button: { backgroundColor: colors.surface }, text: { color: colors.textPrimary } },
      func: { button: { backgroundColor: colors.fabBase }, text: { color: colors.textSecondary } },
      op: { button: { backgroundColor: colors.surface }, text: { color: colors.gold } },
      equals: { button: { backgroundColor: colors.gold }, text: { color: colors.background } },
    }),
    [colors]
  );
  return (
    <View style={styles.pad}>
      {ROWS.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((k) => {
            const variant = VARIANT_STYLES[k.variant];
            return (
              <TouchableOpacity
                key={k.key}
                style={[styles.key, variant.button, { flex: k.span }]}
                onPress={() => onKeyPress(k.key)}
                activeOpacity={0.6}
              >
                {k.icon ? (
                  <MaterialCommunityIcons name={k.icon as any} size={20} color={(variant.text as { color: string }).color} />
                ) : (
                  <Text style={[styles.keyText, variant.text]}>{k.label}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 8, paddingBottom: 8, gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  key: {
    height: 52,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 20, fontWeight: '600' },
});
