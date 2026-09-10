import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';
import { DisplayOptions, DisplayRange } from '@/types';

const RANGE_OPTIONS: { key: DisplayRange; label: string }[] = [
  { key: 'DAILY', label: 'Daily' },
  { key: 'WEEKLY', label: 'Weekly' },
  { key: 'MONTHLY', label: 'Monthly' },
  { key: 'QUARTERLY', label: '3 Months' },
  { key: 'HALF_YEARLY', label: '6 Months' },
  { key: 'YEARLY', label: 'Yearly' },
];

interface Props {
  visible: boolean;
  value: DisplayOptions;
  onChange: (value: DisplayOptions) => void;
  onClose: () => void;
}

export function DisplayOptionsModal({ visible, value, onChange, onClose }: Props) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card}>
          <Text style={[typography.h2, { marginBottom: 12 }]}>Display Options</Text>
          <View style={styles.grid}>
            {RANGE_OPTIONS.map((opt) => {
              const active = value.range === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => onChange({ ...value, range: opt.key })}
                >
                  <Text style={[typography.body, active && { color: colors.background, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.carryRow}>
            <Text style={typography.body}>Carry-over balance</Text>
            <Switch
              value={value.carryOver}
              onValueChange={(v) => onChange({ ...value, carryOver: v })}
              trackColor={{ false: colors.separator, true: colors.gold }}
              thumbColor={colors.textPrimary}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors'], bottomInset: number) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: colors.modalBackdrop, justifyContent: 'flex-end' },
    card: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      paddingBottom: Math.max(18, bottomInset + 12),
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    pill: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
    carryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.separator,
    },
  });
}
