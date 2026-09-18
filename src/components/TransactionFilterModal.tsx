import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Switch, ScrollView, TextInput, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';
import { CategoryIcon } from './CategoryIcon';
import { DisplayOptions, DisplayRange, Category } from '@/types';

export interface TransactionFilters {
  categoryIds: string[];
  minAmount: string;
  maxAmount: string;
  dateFrom?: string; // ISO
  dateTo?: string; // ISO
}

export const DEFAULT_TRANSACTION_FILTERS: TransactionFilters = {
  categoryIds: [],
  minAmount: '',
  maxAmount: '',
};

export function isTransactionFilterActive(filters: TransactionFilters): boolean {
  return (
    filters.categoryIds.length > 0 ||
    filters.minAmount.trim() !== '' ||
    filters.maxAmount.trim() !== '' ||
    !!filters.dateFrom ||
    !!filters.dateTo
  );
}

const RANGE_OPTIONS: { key: DisplayRange; label: string }[] = [
  { key: 'DAILY', label: 'Daily' },
  { key: 'WEEKLY', label: 'Weekly' },
  { key: 'MONTHLY', label: 'Monthly' },
  { key: 'QUARTERLY', label: '3 Months' },
  { key: 'HALF_YEARLY', label: '6 Months' },
  { key: 'YEARLY', label: 'Yearly' },
];

interface Props {
  visible: boolean;
  displayOptions: DisplayOptions;
  onDisplayOptionsChange: (value: DisplayOptions) => void;
  categories: Category[];
  filters: TransactionFilters;
  onFiltersChange: (value: TransactionFilters) => void;
  onClose: () => void;
}

export function TransactionFilterModal({
  visible,
  displayOptions,
  onDisplayOptionsChange,
  categories,
  filters,
  onFiltersChange,
  onClose,
}: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [datePickerTarget, setDatePickerTarget] = useState<'from' | 'to' | null>(null);

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.name.localeCompare(b.name)), [categories]);

  function toggleCategory(id: string) {
    const next = filters.categoryIds.includes(id)
      ? filters.categoryIds.filter((c) => c !== id)
      : [...filters.categoryIds, id];
    onFiltersChange({ ...filters, categoryIds: next });
  }

  function handleClear() {
    onFiltersChange(DEFAULT_TRANSACTION_FILTERS);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={typography.h2}>Filters</Text>
            <TouchableOpacity onPress={handleClear} hitSlop={8}>
              <Text style={{ color: colors.gold, fontWeight: '700' }}>Clear</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[typography.label, styles.sectionLabel]}>PERIOD</Text>
            <View style={styles.grid}>
              {RANGE_OPTIONS.map((opt) => {
                const active = displayOptions.range === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => onDisplayOptionsChange({ ...displayOptions, range: opt.key })}
                  >
                    <Text style={[typography.body, active && { color: colors.background, fontWeight: '700' }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.carryRow}>
              <Text style={typography.body}>Carry-over balance</Text>
              <Switch
                value={displayOptions.carryOver}
                onValueChange={(v) => onDisplayOptionsChange({ ...displayOptions, carryOver: v })}
                trackColor={{ false: colors.separator, true: colors.gold }}
                thumbColor={colors.textPrimary}
              />
            </View>

            <Text style={[typography.label, styles.sectionLabel]}>CATEGORY</Text>
            <View style={styles.grid}>
              {sortedCategories.map((c) => {
                const active = filters.categoryIds.includes(c.id);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.categoryChip, active && { borderColor: colors.gold }]}
                    onPress={() => toggleCategory(c.id)}
                  >
                    <CategoryIcon icon={c.icon} color={c.color} size={22} />
                    <Text style={[typography.body, styles.categoryChipText, active && { color: colors.gold, fontWeight: '700' }]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[typography.label, styles.sectionLabel]}>AMOUNT</Text>
            <View style={styles.amountRow}>
              <TextInput
                style={styles.amountInput}
                placeholder="Min"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                value={filters.minAmount}
                onChangeText={(v) => onFiltersChange({ ...filters, minAmount: v })}
              />
              <Text style={{ color: colors.textSecondary }}>to</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="Max"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                value={filters.maxAmount}
                onChangeText={(v) => onFiltersChange({ ...filters, maxAmount: v })}
              />
            </View>

            <Text style={[typography.label, styles.sectionLabel]}>CUSTOM DATE RANGE</Text>
            <View style={styles.amountRow}>
              <TouchableOpacity style={styles.dateField} onPress={() => setDatePickerTarget('from')}>
                <MaterialCommunityIcons name="calendar" size={16} color={colors.textSecondary} />
                <Text style={[typography.body, !filters.dateFrom && { color: colors.textSecondary }]}>
                  {filters.dateFrom ? format(new Date(filters.dateFrom), 'MMM d, yyyy') : 'From'}
                </Text>
              </TouchableOpacity>
              <Text style={{ color: colors.textSecondary }}>to</Text>
              <TouchableOpacity style={styles.dateField} onPress={() => setDatePickerTarget('to')}>
                <MaterialCommunityIcons name="calendar" size={16} color={colors.textSecondary} />
                <Text style={[typography.body, !filters.dateTo && { color: colors.textSecondary }]}>
                  {filters.dateTo ? format(new Date(filters.dateTo), 'MMM d, yyyy') : 'To'}
                </Text>
              </TouchableOpacity>
            </View>
            {(filters.dateFrom || filters.dateTo) && (
              <TouchableOpacity
                style={{ alignSelf: 'flex-start', marginTop: 6 }}
                onPress={() => onFiltersChange({ ...filters, dateFrom: undefined, dateTo: undefined })}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Clear dates</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={{ color: colors.background, fontWeight: '700' }}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>

      {datePickerTarget && (
        <DateTimePicker
          value={
            (datePickerTarget === 'from' && filters.dateFrom ? new Date(filters.dateFrom) : undefined) ??
            (datePickerTarget === 'to' && filters.dateTo ? new Date(filters.dateTo) : undefined) ??
            new Date()
          }
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            setDatePickerTarget(null);
            if (!selected) return;
            onFiltersChange({
              ...filters,
              [datePickerTarget === 'from' ? 'dateFrom' : 'dateTo']: selected.toISOString(),
            });
          }}
        />
      )}
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: colors.modalBackdrop, justifyContent: 'flex-end' },
    card: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      maxHeight: '80%',
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionLabel: { marginTop: 18, marginBottom: 8 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    pill: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
    carryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.separator,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryChipText: { fontSize: 12 },
    amountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    amountInput: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    dateField: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    doneButton: {
      marginTop: 16,
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: radius.pill,
      backgroundColor: colors.gold,
    },
  });
}
