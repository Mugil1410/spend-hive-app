import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useTheme } from '@/theme/ThemeContext';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { AccountFlow } from '@/utils/calculations';
import { formatCurrency } from '@/utils/formatCurrency';

export function AccountAnalysisView({ flows }: { flows: AccountFlow[] }) {
  const { colors, typography } = useTheme();
  const hasData = flows.some((f) => f.expense > 0 || f.income > 0);

  const barData = useMemo(() => {
    const bars: any[] = [];
    flows.forEach((f, index) => {
      bars.push({
        value: f.expense,
        frontColor: colors.expense,
        label: f.account.name,
        spacing: 2,
        labelWidth: 60,
      });
      bars.push({
        value: f.income,
        frontColor: colors.income,
        spacing: index === flows.length - 1 ? 0 : 20,
      });
    });
    return bars;
  }, [flows]);

  return (
    <View>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
          <Text style={typography.caption}>Expense</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
          <Text style={typography.caption}>Income</Text>
        </View>
      </View>

      {!hasData ? (
        <EmptyState icon="chart-bar" message="No account activity in this period." />
      ) : (
        <View style={styles.chartWrap}>
          <BarChart
            data={barData}
            barWidth={22}
            noOfSections={4}
            yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
            xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
            rulesColor={colors.separator}
            xAxisColor={colors.separator}
            yAxisColor={colors.separator}
            height={200}
          />
        </View>
      )}

      <View style={{ gap: 12, marginTop: 20 }}>
        {flows.map((f) => (
          <Card key={f.account.id}>
            <View style={styles.rowHeader}>
              <Text style={typography.body}>{f.account.name}</Text>
              <Text style={typography.amount}>{formatCurrency(f.balance)}</Text>
            </View>
            <View style={styles.tagsRow}>
              <Text style={[typography.caption, { color: colors.expense }]}>Expense {formatCurrency(f.expense)}</Text>
              <Text style={[typography.caption, { color: colors.income }]}>Income {formatCurrency(f.income)}</Text>
            </View>
          </Card>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legendRow: { flexDirection: 'row', gap: 20, justifyContent: 'center', marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  chartWrap: { alignItems: 'center', paddingVertical: 8 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  tagsRow: { flexDirection: 'row', gap: 16, marginTop: 6 },
});
