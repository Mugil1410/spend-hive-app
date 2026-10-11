import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';
import { FormScreen } from '@/components/FormScreen';
import { NumPad } from '@/components/NumPad';
import { DateTimeFields } from '@/components/DateTimeFields';
import { useAmountInput } from '@/utils/useAmountInput';
import { useCurrencySymbol } from '@/utils/currency';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { formatCurrency } from '@/utils/formatCurrency';

export function RecordPaymentModal() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const route = useRoute<RouteProp<RootStackParamList, 'RecordPayment'>>();
  const { entryId, installmentId, paymentId } = route.params;

  const { cashbookEntries, accounts, recordInstallmentPayment, updateCashbookPayment, deleteCashbookPayment } = useStore();
  const entry = cashbookEntries.find((e) => e.id === entryId);
  const installment = entry?.installments.find((i) => i.id === installmentId);
  const payment = paymentId ? installment?.payments?.find((p) => p.id === paymentId) : undefined;
  const remaining = installment ? installment.expectedAmount - installment.paidAmount : 0;

  const { raw, numericValue, handleKey } = useAmountInput(
    payment ? String(payment.amount) : remaining > 0 ? remaining.toFixed(2) : '0'
  );
  const currencySymbol = useCurrencySymbol();
  const sortedAccounts = useMemo(
    () => accounts.filter((a) => !a.archived).sort((a, b) => a.name.localeCompare(b.name)),
    [accounts]
  );
  // Defaults to the account the entry was created with (when still active); never to an
  // arbitrary first account.
  const [accountId, setAccountId] = useState<string | undefined>(
    payment?.accountId ??
      (entry?.accountId && sortedAccounts.some((a) => a.id === entry.accountId) ? entry.accountId : undefined)
  );
  const [date, setDate] = useState(payment ? new Date(payment.date) : new Date());
  // Guards against a double tap recording the same payment twice before the screen closes.
  const submitted = useRef(false);

  if (!entry || !installment || (paymentId && !payment)) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={typography.body}>{paymentId ? 'Payment not found.' : 'Installment not found.'}</Text>
      </SafeAreaView>
    );
  }

  const accentColor = entry.type === 'LOAN' ? colors.expense : colors.income;
  const canSave = numericValue > 0 && !!accountId && (!!payment || !entry.closedAt);

  function handleSave() {
    if (!canSave || !accountId || submitted.current) return;
    submitted.current = true;
    const ok = payment
      ? updateCashbookPayment(entry!.id, installment!.id, payment.id, {
          amount: numericValue,
          accountId,
          date: date.toISOString(),
        })
      : recordInstallmentPayment(entry!.id, installment!.id, numericValue, accountId, date.toISOString());
    if (!ok) {
      submitted.current = false;
      Alert.alert('Not Saved', 'This payment could not be saved. The entry may have been closed or changed.');
      return;
    }
    navigation.goBack();
  }

  function handleDelete() {
    if (!payment) return;
    Alert.alert(
      'Delete Payment',
      `Delete this ${formatCurrency(payment.amount)} payment? Its linked transaction is deleted too.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteCashbookPayment(entry!.id, installment!.id, payment.id);
            navigation.goBack();
          },
        },
      ]
    );
  }

  return (
    <FormScreen
      title={payment ? 'Edit Payment' : 'Record Payment'}
      onCancel={() => navigation.goBack()}
      onSave={handleSave}
      saveLabel={payment ? 'Save' : 'Confirm'}
      saveDisabled={!canSave}
      footer={<NumPad onKeyPress={handleKey} />}
      scrollViewProps={{ contentContainerStyle: { paddingHorizontal: 0 } }}
    >
      <Text style={[typography.caption, { paddingHorizontal: 16 }]}>
        {entry.type === 'LOAN' ? 'Paying' : 'Collecting from'} {entry.contactName} · Remaining {formatCurrency(remaining)}
      </Text>

      <Text style={[styles.amountText, { color: accentColor }]}>{currencySymbol}{raw}</Text>

      <View style={styles.body}>
        <Text style={typography.label}>{entry.type === 'LOAN' ? 'PAY FROM ACCOUNT' : 'RECEIVE INTO ACCOUNT'}</Text>
        <View style={styles.pillsRow}>
          {sortedAccounts
            .map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[styles.pill, accountId === a.id && styles.pillActive]}
                onPress={() => setAccountId(a.id)}
              >
                <Text style={[typography.body, accountId === a.id && { color: colors.background }]}>{a.name}</Text>
              </TouchableOpacity>
            ))}
        </View>

        <View style={{ marginTop: 16 }}>
          <DateTimeFields value={date} onChange={setDate} dateLabel="PAYMENT DATE" timeLabel="PAYMENT TIME" />
        </View>

        {payment && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={{ color: colors.expense, fontWeight: '700' }}>Delete Payment</Text>
          </TouchableOpacity>
        )}
      </View>
    </FormScreen>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 4 },
    amountText: { textAlign: 'center', fontSize: 40, fontWeight: '700', marginVertical: 16 },
    body: { flex: 1, paddingHorizontal: 16 },
    pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    pill: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
    deleteButton: { alignItems: 'center', marginTop: 20, paddingVertical: 10 },
  });
}
