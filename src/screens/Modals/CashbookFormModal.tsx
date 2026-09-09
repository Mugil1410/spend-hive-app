import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { addDays, format } from 'date-fns';

interface DraftInstallment {
  amount: string;
  dueDate: Date;
}

export function CashbookFormModal() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const route = useRoute<RouteProp<RootStackParamList, 'CashbookForm'>>();
  const { type, entryId } = route.params;

  const { cashbookEntries, addCashbookEntry, updateCashbookEntry } = useStore();
  const editing = entryId ? cashbookEntries.find((e) => e.id === entryId) : undefined;

  const [contactName, setContactName] = useState(editing?.contactName ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [totalAmount, setTotalAmount] = useState(editing ? String(editing.totalAmount) : '');
  const [multiDue, setMultiDue] = useState((editing?.installments.length ?? 1) > 1);
  const [dueCountInput, setDueCountInput] = useState(String(editing?.installments.length ?? 2));
  const [installments, setInstallments] = useState<DraftInstallment[]>(
    editing?.installments.map((i) => ({ amount: String(i.expectedAmount), dueDate: new Date(i.dueDate) })) ?? [
      { amount: '', dueDate: addDays(new Date(), 7) },
    ]
  );
  const [datePickerIndex, setDatePickerIndex] = useState<number | null>(null);
  const [createdAt, setCreatedAt] = useState(editing ? new Date(editing.createdAt) : new Date());
  const [showCreatedAtPicker, setShowCreatedAtPicker] = useState(false);
  const [showCreatedAtTimePicker, setShowCreatedAtTimePicker] = useState(false);

  const contactSuggestions = useMemo(() => {
    if (contactName.trim().length < 3) return [];
    const q = contactName.trim().toLowerCase();
    const names = new Set(cashbookEntries.map((e) => e.contactName));
    return Array.from(names).filter((n) => n.toLowerCase().includes(q) && n.toLowerCase() !== q);
  }, [contactName, cashbookEntries]);

  function regenerateInstallments(count: number, total: string) {
    const amountEach = total ? (parseFloat(total) / count).toFixed(2) : '';
    setInstallments(
      Array.from({ length: count }, (_, i) => ({
        amount: amountEach,
        dueDate: addDays(new Date(), 30 * (i + 1)),
      }))
    );
  }

  function handleMultiToggle(value: boolean) {
    setMultiDue(value);
    if (value) {
      const count = Math.max(2, parseInt(dueCountInput, 10) || 2);
      regenerateInstallments(count, totalAmount);
    } else {
      setInstallments([{ amount: totalAmount, dueDate: addDays(new Date(), 30) }]);
    }
  }

  function handleDueCountChange(text: string) {
    setDueCountInput(text);
    const count = parseInt(text, 10);
    if (count > 0) regenerateInstallments(count, totalAmount);
  }

  function updateInstallmentAmount(index: number, value: string) {
    setInstallments((prev) => prev.map((inst, i) => (i === index ? { ...inst, amount: value } : inst)));
  }

  function updateInstallmentDate(index: number, date: Date) {
    setInstallments((prev) => prev.map((inst, i) => (i === index ? { ...inst, dueDate: date } : inst)));
  }

  const installmentsSum = installments.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const totalValid = parseFloat(totalAmount) > 0;

  const canSave = editing
    ? contactName.trim().length > 0
    : contactName.trim().length > 0 &&
      totalValid &&
      installments.every((i) => parseFloat(i.amount) > 0);

  function handleSave() {
    if (!canSave) return;
    if (editing) {
      updateCashbookEntry(editing.id, {
        contactName: contactName.trim(),
        note: note.trim() || undefined,
        createdAt: createdAt.toISOString(),
      });
    } else {
      addCashbookEntry({
        type,
        contactName: contactName.trim(),
        totalAmount: parseFloat(totalAmount),
        installments: installments.map((i) => ({ expectedAmount: parseFloat(i.amount), dueDate: i.dueDate.toISOString() })),
        note: note.trim() || undefined,
        createdAt: createdAt.toISOString(),
      });
    }
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={typography.h2}>
          {editing ? 'Edit' : 'New'} {type === 'LOAN' ? 'Loan' : 'Lent'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={!canSave}>
          <Text style={[styles.save, !canSave && { opacity: 0.4 }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={typography.label}>CONTACT NAME</Text>
        <TextInput
          style={styles.input}
          value={contactName}
          onChangeText={setContactName}
          placeholder="e.g. Rahul Sharma"
          placeholderTextColor={colors.textSecondary}
        />
        {contactSuggestions.length > 0 && (
          <View style={styles.suggestions}>
            {contactSuggestions.slice(0, 5).map((name) => (
              <TouchableOpacity key={name} style={styles.suggestionRow} onPress={() => setContactName(name)}>
                <MaterialCommunityIcons name="account-outline" size={16} color={colors.textSecondary} />
                <Text style={typography.body}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={[typography.label, { marginTop: 16 }]}>CREATED ON</Text>
        <TouchableOpacity style={styles.createdAtRow} onPress={() => setShowCreatedAtPicker(true)}>
          <MaterialCommunityIcons name="calendar-clock" size={18} color={colors.textSecondary} />
          <Text style={typography.body}>{format(createdAt, 'MMM d, yyyy - h:mm a')}</Text>
        </TouchableOpacity>
        {showCreatedAtPicker && (
          <DateTimePicker
            value={createdAt}
            mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onValueChange={(_, selected) => {
              setShowCreatedAtPicker(false);
              setCreatedAt(selected);
              if (Platform.OS === 'android') setShowCreatedAtTimePicker(true);
            }}
            onDismiss={() => setShowCreatedAtPicker(false)}
          />
        )}
        {showCreatedAtTimePicker && (
          <DateTimePicker
            value={createdAt}
            mode="time"
            display="default"
            onValueChange={(_, selected) => {
              setShowCreatedAtTimePicker(false);
              setCreatedAt(selected);
            }}
            onDismiss={() => setShowCreatedAtTimePicker(false)}
          />
        )}

        {!editing && (
          <>
            <Text style={[typography.label, { marginTop: 16 }]}>TOTAL AMOUNT</Text>
            <TextInput
              style={styles.input}
              value={totalAmount}
              onChangeText={(v) => {
                setTotalAmount(v);
                if (!multiDue) setInstallments([{ amount: v, dueDate: installments[0]?.dueDate ?? addDays(new Date(), 30) }]);
                else regenerateInstallments(Math.max(2, parseInt(dueCountInput, 10) || 2), v);
              }}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[typography.label, { marginTop: 16 }]}>DUE STRUCTURE</Text>
            <View style={styles.pillsRow}>
              <TouchableOpacity
                style={[styles.pill, !multiDue && styles.pillActive]}
                onPress={() => handleMultiToggle(false)}
              >
                <Text style={[typography.body, !multiDue && { color: colors.background }]}>One-Time</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, multiDue && styles.pillActive]}
                onPress={() => handleMultiToggle(true)}
              >
                <Text style={[typography.body, multiDue && { color: colors.background }]}>Multiple Dues</Text>
              </TouchableOpacity>
            </View>

            {multiDue && (
              <View style={styles.dueCountRow}>
                <Text style={typography.body}>Number of dues</Text>
                <TextInput
                  style={styles.dueCountInput}
                  value={dueCountInput}
                  onChangeText={handleDueCountChange}
                  keyboardType="number-pad"
                />
              </View>
            )}

            <Text style={[typography.label, { marginTop: 16 }]}>
              INSTALLMENTS {totalValid && `(entered ${installmentsSum.toFixed(2)} of ${parseFloat(totalAmount).toFixed(2)})`}
            </Text>
            {installments.map((inst, index) => (
              <View key={index} style={styles.installmentCard}>
                <Text style={typography.caption}>Due #{index + 1}</Text>
                <View style={styles.installmentRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginTop: 0 }]}
                    value={inst.amount}
                    onChangeText={(v) => updateInstallmentAmount(index, v)}
                    keyboardType="decimal-pad"
                    placeholder="Amount"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity style={styles.dateChip} onPress={() => setDatePickerIndex(index)}>
                    <MaterialCommunityIcons name="calendar" size={14} color={colors.textSecondary} />
                    <Text style={typography.caption}>{format(inst.dueDate, 'MMM d, yyyy')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {datePickerIndex !== null && (
              <DateTimePicker
                value={installments[datePickerIndex].dueDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onValueChange={(_, selected) => {
                  const idx = datePickerIndex;
                  setDatePickerIndex(null);
                  if (idx !== null) updateInstallmentDate(idx, selected);
                }}
                onDismiss={() => setDatePickerIndex(null)}
              />
            )}
          </>
        )}

        <Text style={[typography.label, { marginTop: 16 }]}>NOTE</Text>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="Optional note"
          placeholderTextColor={colors.textSecondary}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    cancel: { color: colors.textSecondary, fontSize: 14 },
    save: { color: colors.gold, fontSize: 14, fontWeight: '700' },
    body: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    input: {
      marginTop: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    suggestions: {
      marginTop: 4,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12 },
    createdAtRow: {
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
    pillsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
    pill: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
    dueCountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    dueCountInput: {
      width: 60,
      textAlign: 'center',
      paddingVertical: 6,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    installmentCard: {
      marginTop: 10,
      padding: 10,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    installmentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    dateChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 10,
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}
