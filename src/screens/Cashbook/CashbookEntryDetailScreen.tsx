import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { NumPad } from '@/components/NumPad';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { formatCurrency } from '@/utils/formatCurrency';
import { useCurrencySymbol } from '@/utils/currency';
import { useAmountInput } from '@/utils/useAmountInput';
import { format } from 'date-fns';

export function CashbookEntryDetailScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const STATUS_COLOR = { PENDING: colors.textSecondary, PARTIAL: colors.amber, PAID: colors.income };
  const route = useRoute<RouteProp<RootStackParamList, 'CashbookEntryDetail'>>();
  const { entryId } = route.params;

  const { cashbookEntries, deleteCashbookEntry, updateInstallmentDueDate, updateInstallmentAmount } = useStore();
  const entry = cashbookEntries.find((e) => e.id === entryId);
  const [editingDueId, setEditingDueId] = useState<string | null>(null);
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);

  if (!entry) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={typography.body}>Entry not found.</Text>
      </SafeAreaView>
    );
  }

  const accentColor = entry.type === 'LOAN' ? colors.expense : colors.income;
  const paid = entry.installments.reduce((s, i) => s + i.paidAmount, 0);
  const remaining = entry.totalAmount - paid;

  function handleDelete() {
    Alert.alert('Delete Entry', `Delete this ${entry!.type === 'LOAN' ? 'loan' : 'lent'} record permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteCashbookEntry(entry!.id); navigation.goBack(); } },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={typography.h2}>{entry.contactName}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CashbookForm', { type: entry.type, entryId: entry.id })}>
          <MaterialCommunityIcons name="pencil-outline" size={22} color={colors.gold} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card>
          <View style={styles.summaryRow}>
            <View>
              <Text style={typography.label}>TOTAL</Text>
              <Text style={[typography.h1, { color: accentColor }]}>{formatCurrency(entry.totalAmount)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={typography.label}>REMAINING</Text>
              <Text style={typography.h2}>{formatCurrency(Math.max(0, remaining))}</Text>
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <ProgressBar percent={(paid / entry.totalAmount) * 100} color={remaining <= 0 ? colors.income : accentColor} />
          </View>
          {!!entry.note && <Text style={[typography.caption, { marginTop: 10 }]}>{entry.note}</Text>}
        </Card>

        <Text style={typography.label}>INSTALLMENTS</Text>
        {entry.installments.map((inst, index) => {
          const instRemaining = inst.expectedAmount - inst.paidAmount;
          return (
            <Card key={inst.id}>
              <View style={styles.summaryRow}>
                <TouchableOpacity style={styles.dueRow} onPress={() => setEditingDueId(inst.id)}>
                  <Text style={typography.body}>Due #{index + 1} · {format(new Date(inst.dueDate), 'MMM d, yyyy')}</Text>
                  <MaterialCommunityIcons name="pencil-outline" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
                <View style={[styles.statusBadge, { borderColor: STATUS_COLOR[inst.status] }]}>
                  <Text style={{ color: STATUS_COLOR[inst.status], fontSize: 11, fontWeight: '700' }}>{inst.status}</Text>
                </View>
              </View>
              <View style={styles.instAmounts}>
                <TouchableOpacity style={styles.dueRow} onPress={() => setEditingAmountId(inst.id)}>
                  <View>
                    <Text style={typography.caption}>Expected</Text>
                    <Text style={typography.body}>{formatCurrency(inst.expectedAmount)}</Text>
                  </View>
                  <MaterialCommunityIcons name="pencil-outline" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
                <View>
                  <Text style={typography.caption}>Paid</Text>
                  <Text style={typography.body}>{formatCurrency(inst.paidAmount)}</Text>
                </View>
                <View>
                  <Text style={typography.caption}>Remaining</Text>
                  <Text style={typography.body}>{formatCurrency(Math.max(0, instRemaining))}</Text>
                </View>
              </View>
              {inst.status !== 'PAID' && (
                <TouchableOpacity
                  style={styles.payButton}
                  onPress={() => navigation.navigate('RecordPayment', { entryId: entry.id, installmentId: inst.id })}
                >
                  <Text style={{ color: colors.background, fontWeight: '700' }}>Record Payment</Text>
                </TouchableOpacity>
              )}
            </Card>
          );
        })}

        {editingDueId && (
          <DateTimePicker
            value={new Date(entry.installments.find((i) => i.id === editingDueId)!.dueDate)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, selected) => {
              const id = editingDueId;
              setEditingDueId(null);
              if (selected && id) updateInstallmentDueDate(entry.id, id, selected.toISOString());
            }}
          />
        )}

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={{ color: colors.expense, fontWeight: '700' }}>Delete Entry</Text>
        </TouchableOpacity>
      </ScrollView>

      <EditAmountModal
        visible={editingAmountId !== null}
        initialValue={entry.installments.find((i) => i.id === editingAmountId)?.expectedAmount ?? 0}
        onClose={() => setEditingAmountId(null)}
        onSave={(value) => {
          if (editingAmountId) updateInstallmentAmount(entry.id, editingAmountId, value);
        }}
      />
    </SafeAreaView>
  );
}

function EditAmountModal({
  visible,
  initialValue,
  onSave,
  onClose,
}: {
  visible: boolean;
  initialValue: number;
  onSave: (value: number) => void;
  onClose: () => void;
}) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const currencySymbol = useCurrencySymbol();
  const { raw, numericValue, handleKey, reset } = useAmountInput(String(initialValue));

  useEffect(() => {
    if (visible) reset(String(initialValue));
  }, [visible, initialValue, reset]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.amountCard}>
          <Text style={typography.label}>DUE AMOUNT</Text>
          <Text style={[styles.amountText, { color: colors.gold }]}>{currencySymbol}{raw}</Text>
          <NumPad onKeyPress={handleKey} />
          <View style={styles.amountActions}>
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
              <Text style={{ color: colors.background, fontWeight: '700' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, borderWidth: 1 },
    instAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    payButton: {
      marginTop: 12,
      backgroundColor: colors.gold,
      borderRadius: radius.pill,
      alignItems: 'center',
      paddingVertical: 10,
    },
    deleteButton: { alignItems: 'center', paddingVertical: 14, marginTop: 8, marginBottom: 24 },
    backdrop: { flex: 1, backgroundColor: colors.modalBackdrop, justifyContent: 'flex-end' },
    amountCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
    },
    amountText: { textAlign: 'center', fontSize: 36, fontWeight: '700', marginVertical: 16 },
    amountActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
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
