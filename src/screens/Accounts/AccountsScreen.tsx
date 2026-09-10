import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { TopHeader } from '@/components/TopHeader';
import { DateNavigator } from '@/components/DateNavigator';
import { Card } from '@/components/Card';
import { FAB } from '@/components/FAB';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { getRangeForAnchor } from '@/utils/dateUtils';
import { filterTransactionsInRange, sumByType, computeAccountBalance, computeAllAccountBalances } from '@/utils/calculations';
import { formatCurrency } from '@/utils/formatCurrency';

export function AccountsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { accounts, transactions } = useStore();
  const [anchor, setAnchor] = useState(new Date());

  const range = useMemo(() => getRangeForAnchor(anchor, 'MONTHLY'), [anchor]);
  const inRange = useMemo(() => filterTransactionsInRange(transactions, range), [transactions, range]);
  const activeAccounts = useMemo(
    () => accounts.filter((a) => !a.archived).sort((a, b) => a.name.localeCompare(b.name)),
    [accounts]
  );
  const balances = useMemo(() => computeAllAccountBalances(activeAccounts, transactions), [activeAccounts, transactions]);

  const expenseSoFar = sumByType(inRange, 'EXPENSE');
  const incomeSoFar = sumByType(inRange, 'INCOME');
  const totalBalance = activeAccounts.reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);

  return (
    <View style={styles.container}>
      <TopHeader title="Accounts" />
      <DateNavigator anchor={anchor} range="MONTHLY" onChange={setAnchor} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}>
        <Card>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={typography.label}>EXPENSE SO FAR</Text>
              <Text style={[typography.h2, { color: colors.expense }]}>{formatCurrency(expenseSoFar)}</Text>
            </View>
            <View style={styles.summaryCol}>
              <Text style={typography.label}>INCOME SO FAR</Text>
              <Text style={[typography.h2, { color: colors.income }]}>{formatCurrency(incomeSoFar)}</Text>
            </View>
          </View>
          <View style={styles.totalRow}>
            <Text style={typography.label}>TOTAL BALANCE</Text>
            <Text style={typography.h1}>{formatCurrency(totalBalance)}</Text>
          </View>
        </Card>

        {activeAccounts.map((account) => (
          <TouchableOpacity
            key={account.id}
            onPress={() => navigation.navigate('FilteredTransactions', { accountId: account.id, title: account.name })}
          >
            <Card style={styles.accountRow}>
              <View style={[styles.iconCircle, { backgroundColor: account.color + '33' }]}>
                <MaterialCommunityIcons name={account.icon as any} size={22} color={account.color} />
              </View>
              <Text style={[typography.body, { flex: 1 }]}>{account.name}</Text>
              <Text style={typography.amount}>{formatCurrency(balances.get(account.id) ?? 0)}</Text>
              <TouchableOpacity
                style={styles.editButton}
                hitSlop={8}
                onPress={() => navigation.navigate('AccountForm', { accountId: account.id })}
              >
                <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FAB onPress={() => navigation.navigate('AccountForm', undefined)} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
    summaryCol: { alignItems: 'center', flex: 1, gap: 4 },
    totalRow: {
      alignItems: 'center',
      gap: 4,
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.separator,
    },
    accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    editButton: { padding: 4 },
  });
}
