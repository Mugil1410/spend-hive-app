import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { DisplayRange } from '@/types';
import { formatRangeLabel, shiftAnchor } from '@/utils/dateUtils';
import { format, setMonth, setYear } from 'date-fns';

interface Props {
  anchor: Date;
  range: DisplayRange;
  onChange: (date: Date) => void;
}

export function DateNavigator({ anchor, range, onChange }: Props) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={() => onChange(shiftAnchor(anchor, range, -1))} hitSlop={10}>
        <MaterialCommunityIcons name="chevron-left" size={26} color={colors.textPrimary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setPickerVisible(true)} style={styles.labelWrap}>
        <Text style={typography.h2}>{formatRangeLabel(anchor, range)}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onChange(shiftAnchor(anchor, range, 1))} hitSlop={10}>
        <MaterialCommunityIcons name="chevron-right" size={26} color={colors.textPrimary} />
      </TouchableOpacity>

      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerVisible(false)}>
          <Pressable style={styles.pickerCard}>
            <Text style={[typography.h2, { marginBottom: 12 }]}>Select Month</Text>
            <FlatList
              data={Array.from({ length: 12 }, (_, i) => i)}
              numColumns={3}
              keyExtractor={(i) => String(i)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.monthCell}
                  onPress={() => {
                    onChange(setMonth(anchor, item));
                    setPickerVisible(false);
                  }}
                >
                  <Text style={typography.body}>{format(setMonth(new Date(), item), 'MMM')}</Text>
                </TouchableOpacity>
              )}
            />
            <View style={styles.yearRow}>
              <TouchableOpacity onPress={() => onChange(setYear(anchor, anchor.getFullYear() - 1))}>
                <MaterialCommunityIcons name="chevron-left" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={typography.body}>{anchor.getFullYear()}</Text>
              <TouchableOpacity onPress={() => onChange(setYear(anchor, anchor.getFullYear() + 1))}>
                <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      paddingVertical: 8,
    },
    labelWrap: { minWidth: 160, alignItems: 'center' },
    backdrop: {
      flex: 1,
      backgroundColor: colors.modalBackdrop,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      width: '85%',
    },
    monthCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
    },
    yearRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      marginTop: 12,
    },
  });
}
