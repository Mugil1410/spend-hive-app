import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@/theme/ThemeContext';
import { ProgressBar } from '@/components/ProgressBar';
import { CategoryIcon } from '@/components/CategoryIcon';
import { EmptyState } from '@/components/EmptyState';
import { CategoryTotal } from '@/utils/calculations';
import { formatCurrency } from '@/utils/formatCurrency';
import { RootStackParamList } from '@/navigation/types';

interface Props {
  totals: CategoryTotal[];
  grandTotal: number;
  accentColor: string;
}

export function CategoryOverview({ totals, grandTotal, accentColor }: Props) {
  const { colors, typography } = useTheme();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  if (totals.length === 0) {
    return <EmptyState icon="chart-donut" message="No transactions to analyze in this period." />;
  }

  const pieData = totals.map((t) => ({ value: t.total, color: t.category.color, text: '' }));

  return (
    <View>
      <View style={styles.chartWrap}>
        <PieChart
          data={pieData}
          donut
          radius={90}
          innerRadius={62}
          innerCircleColor={colors.background}
          centerLabelComponent={() => (
            <View style={{ alignItems: 'center' }}>
              <Text style={typography.caption}>TOTAL</Text>
              <Text style={[typography.h2, { color: accentColor }]}>{formatCurrency(grandTotal)}</Text>
            </View>
          )}
        />
      </View>

      <View style={{ gap: 14, marginTop: 20 }}>
        {totals.map((t) => (
          <TouchableOpacity
            key={t.category.id}
            onPress={() =>
              navigation.navigate('FilteredTransactions', { categoryId: t.category.id, title: t.category.name })
            }
          >
            <View style={styles.row}>
              <CategoryIcon icon={t.category.icon} color={t.category.color} size={32} />
              <View style={{ flex: 1 }}>
                <View style={styles.rowHeader}>
                  <Text style={typography.body}>{t.category.name}</Text>
                  <Text style={typography.body}>{formatCurrency(t.total)}</Text>
                </View>
                <View style={{ marginTop: 6 }}>
                  <ProgressBar percent={t.percent} color={t.category.color} height={6} />
                </View>
              </View>
              <Text style={[typography.caption, { width: 40, textAlign: 'right' }]}>{t.percent.toFixed(0)}%</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrap: { alignItems: 'center', paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
});
