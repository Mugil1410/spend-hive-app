import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth } from 'date-fns';

interface Props {
  anchor: Date;
  dailyTotals: { date: Date; total: number }[];
  color: string;
}

export function CalendarGrid({ anchor, dailyTotals, color }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cells = useMemo(() => {
    const start = startOfMonth(anchor);
    const end = endOfMonth(anchor);
    const days = eachDayOfInterval({ start, end });
    const leadingBlanks = getDay(start);
    const totalMap = new Map(dailyTotals.map((d) => [d.date.toDateString(), d.total]));
    const maxTotal = Math.max(1, ...dailyTotals.map((d) => d.total));

    const blanks = Array.from({ length: leadingBlanks }, () => null);
    const dayCells = days.map((d) => ({
      date: d,
      total: totalMap.get(d.toDateString()) ?? 0,
      isCurrentMonth: isSameMonth(d, anchor),
      intensity: maxTotal > 0 ? (totalMap.get(d.toDateString()) ?? 0) / maxTotal : 0,
    }));
    return [...blanks, ...dayCells];
  }, [anchor, dailyTotals]);

  return (
    <View>
      <View style={styles.weekHeader}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text key={i} style={styles.weekHeaderText}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((cell, index) =>
          cell === null ? (
            <View key={index} style={styles.cell} />
          ) : (
            <View
              key={index}
              style={[
                styles.cell,
                styles.dayCell,
                cell.total > 0 && { backgroundColor: color + Math.max(20, Math.round(cell.intensity * 255)).toString(16).padStart(2, '0') },
              ]}
            >
              <Text style={styles.dayNumber}>{cell.date.getDate()}</Text>
              {cell.total > 0 && (
                <Text style={styles.dayAmount} numberOfLines={1}>
                  {cell.total >= 1000 ? `${(cell.total / 1000).toFixed(1)}k` : cell.total.toFixed(0)}
                </Text>
              )}
            </View>
          )
        )}
      </View>
    </View>
  );
}

const CELL_SIZE = '14.28%';

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    weekHeader: { flexDirection: 'row' },
    weekHeaderText: { width: CELL_SIZE, textAlign: 'center', color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
    cell: {
      width: CELL_SIZE,
      aspectRatio: 1,
      padding: 2,
    },
    dayCell: {
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.separator,
    },
    dayNumber: { color: colors.textPrimary, fontSize: 11, fontWeight: '600' },
    dayAmount: { color: colors.textSecondary, fontSize: 9, marginTop: 1 },
  });
}
