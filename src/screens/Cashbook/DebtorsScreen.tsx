import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { TopHeader } from '@/components/TopHeader';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FAB } from '@/components/FAB';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { formatCurrency } from '@/utils/formatCurrency';

export function DebtorsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { debtors, cashbookEntries } = useStore();

  const rows = useMemo(() => {
    return debtors
      .filter((d) => !d.archived)
      .map((debtor) => {
        const entries = cashbookEntries.filter((e) => e.debtorId === debtor.id);
        let totalLoans = 0;
        let totalLent = 0;
        let pendingLoans = 0;
        let pendingLent = 0;
        for (const e of entries) {
          const paid = e.installments.reduce((s, i) => s + i.paidAmount, 0);
          const remaining = Math.max(0, e.totalAmount - paid);
          if (e.type === 'LOAN') {
            totalLoans += e.totalAmount;
            pendingLoans += remaining;
          } else {
            totalLent += e.totalAmount;
            pendingLent += remaining;
          }
        }
        return { debtor, totalLoans, totalLent, pendingLoans, pendingLent };
      })
      .sort((a, b) => a.debtor.name.localeCompare(b.debtor.name));
  }, [debtors, cashbookEntries]);

  return (
    <View style={styles.container}>
      <TopHeader title="Debtors" />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.debtor.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
        ListEmptyComponent={<EmptyState icon="account-multiple-outline" message="No debtors yet. They're added automatically from Loan/Lent entries." />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.headerRow}>
              <Text style={typography.h2}>{item.debtor.name}</Text>
              <TouchableOpacity
                hitSlop={8}
                onPress={() => navigation.navigate('DebtorForm', { debtorId: item.debtor.id })}
              >
                <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={typography.caption}>total loans</Text>
                <Text style={[typography.body, { color: colors.expense }]}>{formatCurrency(item.totalLoans)}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={typography.caption}>total lent</Text>
                <Text style={[typography.body, { color: colors.income }]}>{formatCurrency(item.totalLent)}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={typography.caption}>pending loans</Text>
                <Text style={typography.body}>{formatCurrency(item.pendingLoans)}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={typography.caption}>pending lent</Text>
                <Text style={typography.body}>{formatCurrency(item.pendingLent)}</Text>
              </View>
            </View>
          </Card>
        )}
      />
      <FAB onPress={() => navigation.navigate('DebtorForm', undefined)} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
    gridItem: { width: '45%', gap: 2 },
  });
}
