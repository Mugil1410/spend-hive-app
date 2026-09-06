import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { useTheme } from '@/theme/ThemeContext';
import { formatCurrency } from '@/utils/formatCurrency';

export function SummaryCard({ expense, income }: { expense: number; income: number }) {
  const total = income - expense;
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.column}>
          <Text style={typography.label}>EXPENSE</Text>
          <Text style={[typography.h2, { color: colors.expense }]}>{formatCurrency(expense)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.column}>
          <Text style={typography.label}>INCOME</Text>
          <Text style={[typography.h2, { color: colors.income }]}>{formatCurrency(income)}</Text>
        </View>
      </View>
      <View style={styles.totalRow}>
        <Text style={typography.label}>TOTAL</Text>
        <Text style={[typography.h1, { color: total >= 0 ? colors.income : colors.expense }]}>
          {formatCurrency(total, { withSign: false })}
        </Text>
      </View>
    </Card>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginTop: 8,
    },
    topRow: {
      flexDirection: 'row',
    },
    column: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    divider: {
      width: 1,
      backgroundColor: colors.separator,
      marginVertical: 4,
    },
    totalRow: {
      alignItems: 'center',
      gap: 4,
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.separator,
    },
  });
}
