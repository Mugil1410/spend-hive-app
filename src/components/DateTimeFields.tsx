import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { formatDisplayDate, formatDisplayTime, withDatePart, withTimePart } from '@/utils/dateUtils';

interface Props {
  value: Date;
  onChange: (value: Date) => void;
  dateLabel?: string;
  timeLabel?: string;
}

/** Separate date and time fields over one Date value; each picker only changes its own part. */
export function DateTimeFields({ value, onChange, dateLabel = 'DATE', timeLabel = 'TIME' }: Props) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors);
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);

  return (
    <>
      <View style={styles.columns}>
        <View style={styles.column}>
          <Text style={typography.label}>{dateLabel}</Text>
          <TouchableOpacity style={styles.fieldRow} onPress={() => setPicker('date')}>
            <MaterialCommunityIcons name="calendar" size={18} color={colors.textSecondary} />
            <Text style={typography.body}>{formatDisplayDate(value)}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.column}>
          <Text style={typography.label}>{timeLabel}</Text>
          <TouchableOpacity style={styles.fieldRow} onPress={() => setPicker('time')}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={colors.textSecondary} />
            <Text style={typography.body}>{formatDisplayTime(value)}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {picker && (
        <DateTimePicker
          value={value}
          mode={picker}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onValueChange={(_, selected) => {
            const mode = picker;
            setPicker(null);
            onChange(mode === 'date' ? withDatePart(value, selected) : withTimePart(value, selected));
          }}
          onDismiss={() => setPicker(null)}
        />
      )}
    </>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    columns: { flexDirection: 'row', gap: 12 },
    column: { flex: 1, minWidth: 0 },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}
