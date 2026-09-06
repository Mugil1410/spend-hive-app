import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { TopHeader } from '@/components/TopHeader';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { EmptyState } from '@/components/EmptyState';
import { FAB } from '@/components/FAB';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { CashbookType } from '@/types';
import { formatCurrency } from '@/utils/formatCurrency';
import { format } from 'date-fns';

export function CashbookScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { cashbookEntries } = useStore();
  const [tab, setTab] = useState<CashbookType>('LOAN');

  const entries = useMemo(
    () => cashbookEntries.filter((e) => e.type === tab).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [cashbookEntries, tab]
  );

  const accentColor = tab === 'LOAN' ? colors.expense : colors.income;

  return (
    <View style={styles.container}>
      <TopHeader title="Cashbook" />
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'LOAN' && { borderBottomColor: colors.expense, borderBottomWidth: 2 }]}
          onPress={() => setTab('LOAN')}
        >
          <Text style={[typography.h2, tab !== 'LOAN' && { color: colors.textSecondary }]}>Loan</Text>
          <Text style={typography.caption}>You owe them</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'LENT' && { borderBottomColor: colors.income, borderBottomWidth: 2 }]}
          onPress={() => setTab('LENT')}
        >
          <Text style={[typography.h2, tab !== 'LENT' && { color: colors.textSecondary }]}>Lent</Text>
          <Text style={typography.caption}>They owe you</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
        ListEmptyComponent={
          <EmptyState
            icon="handshake-outline"
            message={tab === 'LOAN' ? 'No loans recorded yet.' : 'No lent money recorded yet.'}
          />
        }
        renderItem={({ item }) => {
          const paid = item.installments.reduce((s, i) => s + i.paidAmount, 0);
          const percent = item.totalAmount > 0 ? (paid / item.totalAmount) * 100 : 0;
          const remaining = item.totalAmount - paid;
          const allPaid = remaining <= 0;
          return (
            <TouchableOpacity onPress={() => navigation.navigate('CashbookEntryDetail', { entryId: item.id })}>
              <Card>
                <View style={styles.entryHeader}>
                  <Text style={typography.h2}>{item.contactName}</Text>
                  <Text style={[typography.amount, { color: accentColor }]}>{formatCurrency(item.totalAmount)}</Text>
                </View>
                <Text style={typography.caption}>
                  {item.installments.length > 1 ? `${item.installments.length} installments` : 'One-time'} · Created{' '}
                  {format(new Date(item.createdAt), 'MMM d, yyyy')}
                </Text>
                <View style={{ marginTop: 10 }}>
                  <ProgressBar percent={percent} color={allPaid ? colors.income : accentColor} />
                </View>
                <View style={styles.entryFooter}>
                  <Text style={typography.caption}>{allPaid ? 'Fully settled' : `Remaining ${formatCurrency(remaining)}`}</Text>
                  {allPaid && <MaterialCommunityIcons name="check-circle" size={16} color={colors.income} />}
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
      />

      <FAB onPress={() => navigation.navigate('CashbookForm', { type: tab })} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    tabRow: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.separator },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    entryFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  });
}
