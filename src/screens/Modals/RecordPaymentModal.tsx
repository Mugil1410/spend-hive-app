import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';
import { NumPad } from '@/components/NumPad';
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
  const { entryId, installmentId } = route.params;

  const { cashbookEntries, accounts, recordInstallmentPayment } = useStore();
  const entry = cashbookEntries.find((e) => e.id === entryId);
  const installment = entry?.installments.find((i) => i.id === installmentId);
  const remaining = installment ? installment.expectedAmount - installment.paidAmount : 0;

  const { raw, numericValue, handleKey } = useAmountInput(remaining > 0 ? remaining.toFixed(2) : '0');
  const currencySymbol = useCurrencySymbol();
  const [accountId, setAccountId] = useState<string | undefined>(accounts.find((a) => !a.archived)?.id);

  if (!entry || !installment) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={typography.body}>Installment not found.</Text>
      </SafeAreaView>
    );
  }

  const accentColor = entry.type === 'LOAN' ? colors.expense : colors.income;
  const canSave = numericValue > 0 && !!accountId;

  function handleSave() {
    if (!canSave || !accountId) return;
    recordInstallmentPayment(entry!.id, installment!.id, numericValue, accountId);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={typography.h2}>Record Payment</Text>
        <TouchableOpacity onPress={handleSave} disabled={!canSave}>
          <Text style={[styles.save, !canSave && { opacity: 0.4 }]}>Confirm</Text>
        </TouchableOpacity>
      </View>

      <Text style={[typography.caption, { paddingHorizontal: 16, marginTop: 8 }]}>
        {entry.type === 'LOAN' ? 'Paying' : 'Collecting from'} {entry.contactName} · Remaining {formatCurrency(remaining)}
      </Text>

      <Text style={[styles.amountText, { color: accentColor }]}>{currencySymbol}{raw}</Text>

      <View style={styles.body}>
        <Text style={typography.label}>{entry.type === 'LOAN' ? 'PAY FROM ACCOUNT' : 'RECEIVE INTO ACCOUNT'}</Text>
        <View style={styles.pillsRow}>
          {accounts
            .filter((a) => !a.archived)
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
      </View>

      <NumPad onKeyPress={handleKey} />
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 4 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    cancel: { color: colors.textSecondary, fontSize: 14 },
    save: { color: colors.gold, fontSize: 14, fontWeight: '700' },
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
  });
}
