import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity } from 'react-native';
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
import { CashbookEntry, CashbookType } from '@/types';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDisplayDate } from '@/utils/dateUtils';
import { entryOutstanding, entryPaid, entryRemaining } from '@/store/cashbookSync';

type StatusFilter = 'PENDING' | 'COMPLETED' | 'ALL';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'ALL', label: 'All' },
];

export function CashbookScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { cashbookEntries, debtors } = useStore();
  const [tab, setTab] = useState<CashbookType>('LOAN');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');

  const debtorName = useMemo(() => {
    const byId = new Map(debtors.map((d) => [d.id, d.name]));
    return (entry: CashbookEntry) => (entry.debtorId ? byId.get(entry.debtorId) ?? entry.contactName : entry.contactName);
  }, [debtors]);

  const typeEntries = useMemo(() => cashbookEntries.filter((e) => e.type === tab), [cashbookEntries, tab]);

  // Closed entries owe nothing, so they drop out of pending totals but stay under Completed/All.
  const totalPending = useMemo(
    () => typeEntries.reduce((s, e) => s + entryOutstanding(e), 0),
    [typeEntries]
  );

  const filteredEntries = useMemo(() => {
    return typeEntries.filter((e) => {
      const outstanding = entryOutstanding(e);
      if (statusFilter === 'PENDING') return outstanding > 0;
      if (statusFilter === 'COMPLETED') return outstanding <= 0;
      return true;
    });
  }, [typeEntries, statusFilter]);

  const sections = useMemo(() => {
    const byGroup = new Map<string, { title: string; entries: CashbookEntry[] }>();
    for (const entry of filteredEntries) {
      const key = entry.debtorId ?? `name:${entry.contactName}`;
      if (!byGroup.has(key)) byGroup.set(key, { title: debtorName(entry), entries: [] });
      byGroup.get(key)!.entries.push(entry);
    }
    return Array.from(byGroup.values())
      .map((group) => ({
        title: group.title,
        pending: group.entries.reduce((s, e) => s + entryOutstanding(e), 0),
        data: group.entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [filteredEntries, debtorName]);

  const accentColor = tab === 'LOAN' ? colors.expense : colors.income;

  return (
    <View style={styles.container}>
      <TopHeader title="Cashbook" onPersonPress={() => navigation.navigate('Debtors')} />
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

      <View style={styles.summaryBar}>
        <Text style={typography.label}>
          {tab === 'LOAN' ? 'TOTAL PENDING LOAN AMOUNT' : 'TOTAL PENDING LENT AMOUNT'}
        </Text>
        <Text style={[typography.h2, { color: accentColor }]}>{formatCurrency(totalPending)}</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterPill, statusFilter === f.key && styles.filterPillActive]}
            onPress={() => setStatusFilter(f.key)}
          >
            <Text style={[typography.caption, statusFilter === f.key && { color: colors.background, fontWeight: '700' }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
        ListEmptyComponent={
          <EmptyState
            icon="handshake-outline"
            message={tab === 'LOAN' ? 'No loans in this filter.' : 'No lent money in this filter.'}
          />
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={typography.h2}>{section.title}</Text>
            <Text style={typography.caption}>Pending {formatCurrency(section.pending)}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const paid = entryPaid(item);
          const percent = item.totalAmount > 0 ? (paid / item.totalAmount) * 100 : 0;
          const remaining = entryRemaining(item);
          const allPaid = remaining <= 0;
          const closed = !!item.closedAt;
          return (
            <TouchableOpacity onPress={() => navigation.navigate('CashbookEntryDetail', { entryId: item.id })}>
              <Card style={{ marginBottom: 12 }}>
                <View style={styles.entryHeader}>
                  <Text style={typography.body}>
                    {item.installments.length > 1 ? `${item.installments.length} installments` : 'One-time'}
                  </Text>
                  <Text style={[typography.amount, { color: accentColor }]}>{formatCurrency(item.totalAmount)}</Text>
                </View>
                <Text style={typography.caption}>Created {formatDisplayDate(item.createdAt)}</Text>
                <View style={{ marginTop: 10 }}>
                  <ProgressBar percent={percent} color={allPaid || closed ? colors.income : accentColor} />
                </View>
                <View style={styles.entryFooter}>
                  <Text style={typography.caption}>
                    {allPaid
                      ? 'Fully settled'
                      : closed
                        ? `Closed · ${formatCurrency(item.closedOutstanding ?? remaining)} written off`
                        : `Remaining ${formatCurrency(remaining)}`}
                  </Text>
                  {allPaid && <MaterialCommunityIcons name="check-circle" size={16} color={colors.income} />}
                  {closed && !allPaid && <MaterialCommunityIcons name="lock-check-outline" size={16} color={colors.textSecondary} />}
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
    summaryBar: {
      paddingHorizontal: 16,
      paddingTop: 12,
      alignItems: 'center',
      gap: 2,
    },
    filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
    filterPill: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterPillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background,
      paddingBottom: 8,
    },
    entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    entryFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  });
}
