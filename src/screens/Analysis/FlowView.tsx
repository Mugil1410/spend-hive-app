import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '@/theme/ThemeContext';
import { CalendarGrid } from './CalendarGrid';
import { EmptyState } from '@/components/EmptyState';
import { Transaction } from '@/types';
import { DateRange, daysInRange } from '@/utils/dateUtils';
import { dailyTotals } from '@/utils/calculations';
import { format } from 'date-fns';

interface Props {
  transactions: Transaction[];
  type: 'EXPENSE' | 'INCOME';
  range: DateRange;
  anchor: Date;
  color: string;
}

export function FlowView({ transactions, type, range, anchor, color }: Props) {
  const { colors, typography } = useTheme();
  const days = useMemo(() => daysInRange(range), [range]);
  const totals = useMemo(() => dailyTotals(transactions, type, days), [transactions, type, days]);

  const hasData = totals.some((t) => t.total > 0);
  const lineData = totals.map((t) => ({ value: t.total, label: format(t.date, 'd'), dataPointText: '' }));

  return (
    <View>
      {!hasData ? (
        <EmptyState icon="chart-line" message="No data to chart in this period." />
      ) : (
        <View style={styles.chartWrap}>
          <LineChart
            data={lineData}
            color={color}
            thickness={2}
            areaChart
            startFillColor={color}
            endFillColor={color}
            startOpacity={0.3}
            endOpacity={0.02}
            yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
            xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 8 }}
            noOfSections={4}
            rulesColor={colors.separator}
            xAxisColor={colors.separator}
            yAxisColor={colors.separator}
            hideDataPoints={days.length > 20}
            height={180}
            initialSpacing={10}
            spacing={Math.max(16, 300 / Math.max(1, days.length))}
          />
        </View>
      )}

      <Text style={[typography.label, { marginTop: 20, marginBottom: 4 }]}>DAILY BREAKDOWN</Text>
      <CalendarGrid anchor={anchor} dailyTotals={totals} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrap: { paddingVertical: 12 },
});
