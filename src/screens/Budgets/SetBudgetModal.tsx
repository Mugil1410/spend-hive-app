import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';
import { NumPad } from '@/components/NumPad';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useAmountInput } from '@/utils/useAmountInput';
import { useCurrencySymbol } from '@/utils/currency';
import { Category } from '@/types';

interface Props {
  visible: boolean;
  category: Category | null;
  initialValue?: number;
  onClose: () => void;
  onSave: (limit: number) => void;
}

export function SetBudgetModal({ visible, category, initialValue, onClose, onSave }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { raw, numericValue, handleKey, reset } = useAmountInput(initialValue ? String(initialValue) : '0');
  const currencySymbol = useCurrencySymbol();

  React.useEffect(() => {
    if (visible) reset(initialValue ? String(initialValue) : '0');
  }, [visible, initialValue, reset]);

  if (!category) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card}>
          <View style={styles.header}>
            <CategoryIcon icon={category.icon} color={category.color} />
            <Text style={typography.h2}>{category.name}</Text>
          </View>
          <Text style={styles.amountText}>{currencySymbol}{raw}</Text>
          <NumPad onKeyPress={handleKey} />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
                onSave(numericValue);
                onClose();
              }}
            >
              <Text style={{ color: colors.background, fontWeight: '700' }}>Set Budget</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: colors.modalBackdrop, justifyContent: 'flex-end' },
    card: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    amountText: { textAlign: 'center', fontSize: 36, fontWeight: '700', color: colors.gold, marginVertical: 16 },
    actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    saveButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: radius.pill,
      backgroundColor: colors.gold,
    },
  });
}
