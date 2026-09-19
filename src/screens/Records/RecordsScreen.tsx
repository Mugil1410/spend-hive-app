import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, TextInput, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@/theme/ThemeContext';
import { TopHeader } from '@/components/TopHeader';
import { DateNavigator } from '@/components/DateNavigator';
import { SummaryCard } from '@/components/SummaryCard';
import { CategoryIcon } from '@/components/CategoryIcon';
import { FAB } from '@/components/FAB';
import { EmptyState } from '@/components/EmptyState';
import { TransactionFilterModal, TransactionFilters, DEFAULT_TRANSACTION_FILTERS, isTransactionFilterActive } from '@/components/TransactionFilterModal';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { DisplayOptions, Transaction } from '@/types';
import { getRangeForAnchor, groupHeaderLabel } from '@/utils/dateUtils';
import { filterTransactionsInRange, sumByType } from '@/utils/calculations';
import { formatSignedAmount } from '@/utils/formatCurrency';

export function RecordsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const { transactions, categories, accounts, deleteTransaction } = useStore();

  const [anchor, setAnchor] = useState(new Date());
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>({ range: 'MONTHLY', carryOver: false });
  const [filterVisible, setFilterVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [txFilters, setTxFilters] = useState<TransactionFilters>(DEFAULT_TRANSACTION_FILTERS);

  const range = useMemo(() => getRangeForAnchor(anchor, displayOptions.range), [anchor, displayOptions.range]);

  const inRange = useMemo(() => filterTransactionsInRange(transactions, range), [transactions, range]);

  const filtered = useMemo(() => {
    let list = inRange;

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) => {
        const category = categories.find((c) => c.id === t.categoryId);
        return (t.note ?? '').toLowerCase().includes(q) || (category?.name ?? '').toLowerCase().includes(q);
      });
    }

    if (txFilters.categoryId) {
      list = list.filter((t) => t.categoryId === txFilters.categoryId);
    }
    if (txFilters.accountId) {
      list = list.filter((t) => t.accountId === txFilters.accountId || t.toAccountId === txFilters.accountId);
    }

    const min = parseFloat(txFilters.minAmount);
    if (!Number.isNaN(min)) list = list.filter((t) => t.amount >= min);
    const max = parseFloat(txFilters.maxAmount);
    if (!Number.isNaN(max)) list = list.filter((t) => t.amount <= max);

    if (txFilters.dateFrom) {
      const from = new Date(txFilters.dateFrom).setHours(0, 0, 0, 0);
      list = list.filter((t) => new Date(t.date).getTime() >= from);
    }
    if (txFilters.dateTo) {
      const to = new Date(txFilters.dateTo).setHours(23, 59, 59, 999);
      list = list.filter((t) => new Date(t.date).getTime() <= to);
    }

    return list;
  }, [inRange, query, categories, txFilters]);

  const expense = sumByType(inRange, 'EXPENSE');
  const income = sumByType(inRange, 'INCOME');

  const sections = useMemo(() => {
    const byDate = new Map<string, Transaction[]>();
    const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const tx of sorted) {
      const key = new Date(tx.date).toDateString();
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(tx);
    }
    return Array.from(byDate.entries()).map(([key, data]) => ({
      title: groupHeaderLabel(data[0].date),
      data,
    }));
  }, [filtered]);

  return (
    <View style={styles.container}>
      <TopHeader
        title="Transactions"
        onSearchPress={() => setSearchVisible((v) => !v)}
        onFilterPress={() => setFilterVisible(true)}
        filterActive={isTransactionFilterActive(txFilters)}
      />
      {searchVisible && (
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes or categories"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      )}
      <DateNavigator anchor={anchor} range={displayOptions.range} onChange={setAnchor} />
      <SummaryCard expense={expense} income={income} />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        style={{ marginTop: 8 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="notebook-outline"
            message={
              isTransactionFilterActive(txFilters) || query.trim()
                ? 'No transactions match your filters.'
                : 'No transactions in this period.'
            }
          />
        }
        renderItem={({ item }) => {
          const category = categories.find((c) => c.id === item.categoryId);
          const account = accounts.find((a) => a.id === item.accountId);
          return (
            <Swipeable
              renderRightActions={() => (
                <TouchableOpacity
                  style={styles.deleteAction}
                  onPress={() => deleteTransaction(item.id)}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color="#fff" />
                </TouchableOpacity>
              )}
            >
              <TouchableOpacity
                style={styles.row}
                onPress={() => navigation.navigate('QuickAdd', { transactionId: item.id })}
              >
                <CategoryIcon
                  icon={item.type === 'TRANSFER' ? 'swap-horizontal' : category?.icon ?? 'help'}
                  color={item.type === 'TRANSFER' ? colors.gold : category?.color ?? colors.textSecondary}
                />
                <View style={styles.rowMiddle}>
                  <Text style={typography.body}>
                    {item.type === 'TRANSFER' ? 'Transfer' : category?.name ?? 'Uncategorized'}
                  </Text>
                  <View style={styles.rowSub}>
                    <View style={styles.accountBadge}>
                      <Text style={styles.accountBadgeText}>{account?.name ?? '—'}</Text>
                    </View>
                  </View>
                </View>
                <Text
                  style={[
                    typography.amount,
                    { color: item.type === 'EXPENSE' ? colors.expense : item.type === 'INCOME' ? colors.income : colors.textPrimary },
                  ]}
                >
                  {formatSignedAmount(item.amount, item.type)}
                </Text>
              </TouchableOpacity>
            </Swipeable>
          );
        }}
      />

      <TransactionFilterModal
        visible={filterVisible}
        displayOptions={displayOptions}
        onDisplayOptionsChange={setDisplayOptions}
        categories={categories}
        accounts={accounts}
        filters={txFilters}
        onFiltersChange={setTxFilters}
        onClose={() => setFilterVisible(false)}
      />

      <FAB onPress={() => navigation.navigate('QuickAdd', undefined)} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors'], typography: ReturnType<typeof useTheme>['typography']) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.textPrimary },
  sectionHeader: {
    ...typography.label,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  rowMiddle: { flex: 1, gap: 4 },
  rowSub: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountBadgeText: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
  deleteAction: {
    backgroundColor: colors.expense,
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
  },
  });
}
