import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { TopHeader } from '@/components/TopHeader';
import { DateNavigator } from '@/components/DateNavigator';
import { SummaryCard } from '@/components/SummaryCard';
import { DisplayOptionsModal } from '@/components/DisplayOptionsModal';
import { ViewSelector } from './ViewSelector';
import { CategoryOverview } from './CategoryOverview';
import { FlowView } from './FlowView';
import { AccountAnalysisView } from './AccountAnalysisView';
import { useStore } from '@/store/useStore';
import { AnalysisView, DisplayOptions } from '@/types';
import { getRangeForAnchor } from '@/utils/dateUtils';
import { filterTransactionsInRange, sumByType, categoryTotals, accountFlows } from '@/utils/calculations';

export function AnalysisScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { transactions, categories, accounts } = useStore();
  const [anchor, setAnchor] = useState(new Date());
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>({ range: 'MONTHLY', carryOver: false });
  const [filterVisible, setFilterVisible] = useState(false);
  const [view, setView] = useState<AnalysisView>('EXPENSE_OVERVIEW');

  const range = useMemo(() => getRangeForAnchor(anchor, displayOptions.range), [anchor, displayOptions.range]);
  const inRange = useMemo(() => filterTransactionsInRange(transactions, range), [transactions, range]);

  const expense = sumByType(inRange, 'EXPENSE');
  const income = sumByType(inRange, 'INCOME');

  const expenseTotals = useMemo(() => categoryTotals(inRange, categories, 'EXPENSE'), [inRange, categories]);
  const incomeTotals = useMemo(() => categoryTotals(inRange, categories, 'INCOME'), [inRange, categories]);
  const flows = useMemo(() => accountFlows(inRange, transactions, accounts), [inRange, transactions, accounts]);

  return (
    <View style={styles.container}>
      <TopHeader title="Analysis" onFilterPress={() => setFilterVisible(true)} />
      <DateNavigator anchor={anchor} range={displayOptions.range} onChange={setAnchor} />
      <SummaryCard expense={expense} income={income} />
      <ViewSelector value={view} onChange={setView} />

      <ScrollView contentContainerStyle={styles.content}>
        {view === 'EXPENSE_OVERVIEW' && (
          <CategoryOverview totals={expenseTotals} grandTotal={expense} accentColor={colors.expense} />
        )}
        {view === 'INCOME_OVERVIEW' && (
          <CategoryOverview totals={incomeTotals} grandTotal={income} accentColor={colors.income} />
        )}
        {view === 'EXPENSE_FLOW' && (
          <FlowView transactions={inRange} type="EXPENSE" range={range} anchor={anchor} color={colors.expense} />
        )}
        {view === 'INCOME_FLOW' && (
          <FlowView transactions={inRange} type="INCOME" range={range} anchor={anchor} color={colors.income} />
        )}
        {view === 'ACCOUNT_ANALYSIS' && <AccountAnalysisView flows={flows} />}
      </ScrollView>

      <DisplayOptionsModal
        visible={filterVisible}
        value={displayOptions}
        onChange={setDisplayOptions}
        onClose={() => setFilterVisible(false)}
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 100 },
  });
}
