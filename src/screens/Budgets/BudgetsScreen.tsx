import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { subMonths } from 'date-fns';
import { useTheme } from '@/theme/ThemeContext';
import { TopHeader } from '@/components/TopHeader';
import { DateNavigator } from '@/components/DateNavigator';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { EmptyState } from '@/components/EmptyState';
import { SetBudgetModal } from './SetBudgetModal';
import { useStore } from '@/store/useStore';
import { Category } from '@/types';
import { periodKeyForMonth } from '@/utils/dateUtils';
import { budgetProgressColor, budgetSpentForCategory } from '@/utils/calculations';
import { formatCurrency } from '@/utils/formatCurrency';

export function BudgetsScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { categories, budgets, transactions, setBudget, copyBudgetsForward } = useStore();
  const [anchor, setAnchor] = useState(new Date());
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const period = periodKeyForMonth(anchor);
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'EXPENSE').sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  );

  const budgeted = useMemo(
    () =>
      expenseCategories
        .map((c) => {
          const budget = budgets.find((b) => b.categoryId === c.id && b.period === period);
          if (!budget) return null;
          const spent = budgetSpentForCategory(transactions, c.id, period);
          return { category: c, limit: budget.limit, spent };
        })
        .filter((v): v is { category: Category; limit: number; spent: number } => v !== null),
    [expenseCategories, budgets, period, transactions]
  );

  const notBudgeted = expenseCategories.filter((c) => !budgets.some((b) => b.categoryId === c.id && b.period === period));

  const totalBudget = budgeted.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgeted.reduce((s, b) => s + b.spent, 0);

  function handleCopyPreviousMonth() {
    const previousPeriod = periodKeyForMonth(subMonths(anchor, 1));
    const hasExisting = budgets.some((b) => b.period === period);
    const hasPrevious = budgets.some((b) => b.period === previousPeriod);
    if (!hasPrevious) {
      Alert.alert('Nothing to Copy', 'The previous month has no budget entries.');
      return;
    }
    if (hasExisting) {
      Alert.alert(
        'Copy Previous Month?',
        'Current month already has budget entries. Do you want to copy the previous month\'s budget?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Copy & Overwrite', style: 'destructive', onPress: () => copyBudgetsForward(previousPeriod, period) },
        ]
      );
      return;
    }
    copyBudgetsForward(previousPeriod, period);
  }

  return (
    <View style={styles.container}>
      <TopHeader title="Budgets" />
      <DateNavigator anchor={anchor} range="MONTHLY" onChange={setAnchor} />
      <TouchableOpacity style={styles.copyButton} onPress={handleCopyPreviousMonth} hitSlop={8}>
        <MaterialCommunityIcons name="content-copy" size={16} color={colors.gold} />
        <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 12 }}>Copy previous month</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}>
        <Card>
          <View style={styles.summaryRow}>
            <View>
              <Text style={typography.label}>TOTAL BUDGET</Text>
              <Text style={typography.h1}>{formatCurrency(totalBudget)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={typography.label}>TOTAL SPENT</Text>
              <Text style={[typography.h1, { color: totalSpent > totalBudget ? colors.expense : colors.textPrimary }]}>
                {formatCurrency(totalSpent)}
              </Text>
            </View>
          </View>
        </Card>

        <Text style={typography.label}>BUDGETED CATEGORIES</Text>
        {budgeted.length === 0 && <EmptyState icon="wallet-outline" message="No budgets set for this month yet." />}
        {budgeted.map(({ category, limit, spent }) => {
          const percent = limit > 0 ? (spent / limit) * 100 : 0;
          const color = budgetProgressColor(percent);
          return (
            <TouchableOpacity key={category.id} onPress={() => setEditingCategory(category)}>
              <Card>
                <View style={styles.summaryRow}>
                  <Text style={typography.body}>{category.name}</Text>
                  <Text style={typography.caption}>
                    {formatCurrency(spent)} / {formatCurrency(limit)}
                  </Text>
                </View>
                <View style={{ marginTop: 8 }}>
                  <ProgressBar percent={percent} color={color} />
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        <Text style={[typography.label, { marginTop: 8 }]}>NOT BUDGETED</Text>
        {notBudgeted.map((category) => (
          <Card key={category.id} style={styles.notBudgetedRow}>
            <Text style={typography.body}>{category.name}</Text>
            <TouchableOpacity style={styles.setBudgetButton} onPress={() => setEditingCategory(category)}>
              <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 12 }}>SET BUDGET</Text>
            </TouchableOpacity>
          </Card>
        ))}
      </ScrollView>

      <SetBudgetModal
        visible={!!editingCategory}
        category={editingCategory}
        initialValue={editingCategory ? budgets.find((b) => b.categoryId === editingCategory.id && b.period === period)?.limit : undefined}
        onClose={() => setEditingCategory(null)}
        onSave={(limit) => {
          if (editingCategory) setBudget(editingCategory.id, period, limit);
        }}
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    copyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 8,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    notBudgetedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    setBudgetButton: {
      borderWidth: 1,
      borderColor: colors.gold,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
  });
}
