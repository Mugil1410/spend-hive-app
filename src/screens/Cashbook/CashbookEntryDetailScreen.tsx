import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Modal, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { formatDisplayDate, formatDisplayTime } from '@/utils/dateUtils';
import { canCloseEntry, countEntryTransactions, entryRemaining } from '@/store/cashbookSync';

export function CashbookEntryDetailScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const STATUS_COLOR = { PENDING: colors.textSecondary, PARTIAL: colors.amber, PAID: colors.income };
  const route = useRoute<RouteProp<RootStackParamList, 'CashbookEntryDetail'>>();
  const { entryId } = route.params;

  const {
    cashbookEntries,
    transactions,
    accounts,
    deleteCashbookEntry,
    updateInstallmentDueDate,
    updateInstallmentAmount,
    closeCashbookEntry,
    reopenCashbookEntry,
  } = useStore();
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
  const remaining = entryRemaining(entry);
  const closed = !!entry.closedAt;
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—';

  function handleDelete() {
    const kind = entry!.type === 'LOAN' ? 'loan' : 'lent';
    const linkedCount = countEntryTransactions({ transactions, cashbookEntries }, entry!.id);
    const remove = (deleteTransactions: boolean) => {
      deleteCashbookEntry(entry!.id, { deleteTransactions });
      navigation.goBack();
    };
    if (linkedCount === 0) {
      Alert.alert('Delete Entry', `Delete this ${kind} record permanently?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => remove(false) },
      ]);
      return;
    }
    Alert.alert(
      'Delete Entry',
      `This ${kind} record has ${linkedCount} linked transaction${linkedCount === 1 ? '' : 's'}. ` +
        'Delete them too, or keep them as ordinary transactions (account balances stay as they are)?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Keep Transactions', onPress: () => remove(false) },
        { text: 'Delete All', style: 'destructive', onPress: () => remove(true) },
      ]
    );
  }

  function handleClose() {
    Alert.alert(
      'Close Entry',
      `Close this ${entry!.type === 'LOAN' ? 'loan' : 'lent'} record with ${formatCurrency(remaining)} still remaining? ` +
        'The remainder is written off. No transaction is created and no account balance changes.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Close Entry', onPress: () => closeCashbookEntry(entry!.id) },
      ]
    );
  }

  function handleReopen() {
    Alert.alert('Reopen Entry', 'Mark the remaining amount as outstanding again?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reopen', onPress: () => reopenCashbookEntry(entry!.id) },
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
              <Text style={typography.label}>{closed ? 'WRITTEN OFF' : 'REMAINING'}</Text>
              <Text style={typography.h2}>{formatCurrency(Math.max(0, closed ? entry.closedOutstanding ?? remaining : remaining))}</Text>
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <ProgressBar percent={(paid / entry.totalAmount) * 100} color={remaining <= 0 || closed ? colors.income : accentColor} />
          </View>
          <View style={[styles.summaryRow, { marginTop: 10 }]}>
            <Text style={typography.caption}>{entry.type === 'LOAN' ? 'Paid' : 'Received'} {formatCurrency(paid)}</Text>
            {closed && (
              <View style={[styles.statusBadge, { borderColor: colors.textSecondary }]}>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>CLOSED</Text>
              </View>
            )}
          </View>
          {closed && (
            <Text style={[typography.caption, { marginTop: 6 }]}>
              Closed on {formatDisplayDate(entry.closedAt!)} · {formatDisplayTime(entry.closedAt!)}. The written-off amount was not
              recorded as a payment.
            </Text>
          )}
          {!!entry.note && <Text style={[typography.caption, { marginTop: 10 }]}>{entry.note}</Text>}
          {canCloseEntry(entry) && (
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <MaterialCommunityIcons name="lock-check-outline" size={16} color={colors.gold} />
              <Text style={{ color: colors.gold, fontWeight: '700' }}>Close Entry</Text>
            </TouchableOpacity>
          )}
          {closed && (
            <TouchableOpacity style={styles.closeButton} onPress={handleReopen}>
              <MaterialCommunityIcons name="lock-open-variant-outline" size={16} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Reopen Entry</Text>
            </TouchableOpacity>
          )}
        </Card>

        <Text style={typography.label}>INSTALLMENTS</Text>
        {entry.installments.map((inst, index) => {
          const instRemaining = inst.expectedAmount - inst.paidAmount;
          return (
            <Card key={inst.id}>
              <View style={styles.summaryRow}>
                <TouchableOpacity style={styles.dueRow} onPress={() => setEditingDueId(inst.id)}>
                  <Text style={typography.body}>Due #{index + 1} · {formatDisplayDate(inst.dueDate)}</Text>
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
              {(inst.payments ?? []).length > 0 && (
                <View style={styles.paymentsList}>
                  <Text style={typography.caption}>Payments (tap to edit)</Text>
                  {[...(inst.payments ?? [])]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.paymentRow}
                        onPress={() =>
                          navigation.navigate('RecordPayment', { entryId: entry.id, installmentId: inst.id, paymentId: p.id })
                        }
                      >
                        <Text style={[typography.caption, { flex: 1 }]} numberOfLines={1}>
                          {formatDisplayDate(p.date)} · {formatDisplayTime(p.date)} · {accountName(p.accountId)}
                        </Text>
                        <Text style={typography.body}>{formatCurrency(p.amount)}</Text>
                        <MaterialCommunityIcons name="pencil-outline" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    ))}
                </View>
              )}
              {!!inst.untrackedPaidAmount && (
                <Text style={[typography.caption, { marginTop: 6 }]}>
                  Includes {formatCurrency(inst.untrackedPaidAmount)} recorded before payments were linked to transactions.
                </Text>
              )}
              {inst.status !== 'PAID' && !closed && (
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
            onValueChange={(_, selected) => {
              const id = editingDueId;
              setEditingDueId(null);
              if (id) updateInstallmentDueDate(entry.id, id, selected.toISOString());
            }}
            onDismiss={() => setEditingDueId(null)}
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
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
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
          <Text style={[typography.caption, { marginTop: 4 }]}>
            The amount expected for this due. To correct money already paid, edit the payment instead.
          </Text>
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

function createStyles(colors: ReturnType<typeof useTheme>['colors'], bottomInset = 0) {
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
    paymentsList: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.separator, gap: 2 },
    paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
    closeButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      paddingVertical: 9,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
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
      paddingBottom: Math.max(18, bottomInset + 12),
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
