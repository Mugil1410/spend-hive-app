import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';
import { AnalysisView } from '@/types';

const OPTIONS: { key: AnalysisView; label: string; icon: string }[] = [
  { key: 'EXPENSE_OVERVIEW', label: 'Expense Overview', icon: 'chart-donut' },
  { key: 'INCOME_OVERVIEW', label: 'Income Overview', icon: 'chart-donut' },
  { key: 'EXPENSE_FLOW', label: 'Expense Flow', icon: 'chart-line' },
  { key: 'INCOME_FLOW', label: 'Income Flow', icon: 'chart-line' },
  { key: 'ACCOUNT_ANALYSIS', label: 'Account Analysis', icon: 'chart-bar' },
];

export function ViewSelector({ value, onChange }: { value: AnalysisView; onChange: (v: AnalysisView) => void }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find((o) => o.key === value)!;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <MaterialCommunityIcons name={current.icon as any} size={18} color={colors.gold} />
        <Text style={[typography.body, { fontWeight: '700' }]}>{current.label}</Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.menu}>
            {OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.item, opt.key === value && styles.itemActive]}
                onPress={() => {
                  onChange(opt.key);
                  setOpen(false);
                }}
              >
                <MaterialCommunityIcons name={opt.icon as any} size={18} color={opt.key === value ? colors.gold : colors.textSecondary} />
                <Text style={[typography.body, opt.key === value && { color: colors.gold, fontWeight: '700' }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', paddingVertical: 8 },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    backdrop: { flex: 1, backgroundColor: colors.modalBackdrop, alignItems: 'center', justifyContent: 'center' },
    menu: {
      width: '80%',
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 8,
    },
    item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
    itemActive: { backgroundColor: colors.background },
  });
}
