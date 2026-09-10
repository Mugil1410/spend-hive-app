import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';
import { FormScreen } from '@/components/FormScreen';
import { NumPad } from '@/components/NumPad';
import { CategoryIcon } from '@/components/CategoryIcon';
import { SelectSheet, SelectOption } from '@/components/SelectSheet';
import { useAmountInput } from '@/utils/useAmountInput';
import { useCurrencySymbol } from '@/utils/currency';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { TransactionType } from '@/types';
import { format } from 'date-fns';

const TYPES: TransactionType[] = ['EXPENSE', 'INCOME', 'TRANSFER'];

type ActiveSheet = 'category' | 'account' | 'toAccount' | 'event' | null;

export function QuickAddModal() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const TYPE_COLORS: Record<TransactionType, string> = useMemo(
    () => ({
      EXPENSE: colors.expense,
      INCOME: colors.income,
      TRANSFER: colors.gold,
    }),
    [colors]
  );
  const currencySymbol = useCurrencySymbol();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'QuickAdd'>>();
  const editingId = route.params?.transactionId;

  const { transactions, categories, accounts, events, addTransaction, updateTransaction, deleteTransaction } = useStore();
  const editingTx = editingId ? transactions.find((t) => t.id === editingId) : undefined;

  const [type, setType] = useState<TransactionType>(editingTx?.type ?? route.params?.type ?? 'EXPENSE');
  const { raw, numericValue, handleKey } = useAmountInput(editingTx ? String(editingTx.amount) : '0');
  const [categoryId, setCategoryId] = useState<string | undefined>(editingTx?.categoryId);
  const [accountId, setAccountId] = useState<string | undefined>(editingTx?.accountId ?? accounts[0]?.id);
  const [toAccountId, setToAccountId] = useState<string | undefined>(editingTx?.toAccountId ?? accounts[1]?.id);
  const [eventId, setEventId] = useState<string | undefined>(editingTx?.eventId ?? route.params?.eventId);
  const [date, setDate] = useState(editingTx ? new Date(editingTx.date) : new Date());
  const [note, setNote] = useState(editingTx?.note ?? '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);

  const visibleCategories = useMemo(
    () =>
      categories
        .filter((c) => c.type === (type === 'INCOME' ? 'INCOME' : 'EXPENSE'))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories, type]
  );
  const activeAccounts = useMemo(
    () => accounts.filter((a) => !a.archived).sort((a, b) => a.name.localeCompare(b.name)),
    [accounts]
  );
  const toAccountOptions = useMemo(() => activeAccounts.filter((a) => a.id !== accountId), [activeAccounts, accountId]);

  const activeEvents = useMemo(
    () => events.filter((e) => !e.archived).sort((a, b) => a.name.localeCompare(b.name)),
    [events]
  );

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedAccount = accounts.find((a) => a.id === accountId);
  const selectedToAccount = accounts.find((a) => a.id === toAccountId);
  const selectedEvent = events.find((e) => e.id === eventId);

  const categoryOptions: SelectOption[] = visibleCategories.map((c) => ({ id: c.id, label: c.name, icon: c.icon, color: c.color }));
  const accountOptions: SelectOption[] = activeAccounts.map((a) => ({ id: a.id, label: a.name, icon: a.icon, color: a.color }));
  const toAccountSelectOptions: SelectOption[] = toAccountOptions.map((a) => ({ id: a.id, label: a.name, icon: a.icon, color: a.color }));
  const eventOptions: SelectOption[] = [
    { id: '', label: 'No event' },
    ...activeEvents.map((e) => ({ id: e.id, label: e.name, icon: e.icon, color: e.color })),
  ];

  const canSave =
    numericValue > 0 &&
    accountId &&
    (type === 'TRANSFER' ? !!toAccountId && toAccountId !== accountId : !!categoryId);

  function handleSave() {
    if (!canSave || !accountId) return;
    const payload = {
      amount: numericValue,
      type,
      categoryId: type === 'TRANSFER' ? '' : categoryId!,
      accountId,
      toAccountId: type === 'TRANSFER' ? toAccountId : undefined,
      eventId: type === 'TRANSFER' ? undefined : eventId,
      date: date.toISOString(),
      note: note.trim() || undefined,
    };
    if (editingId) {
      updateTransaction(editingId, payload);
    } else {
      addTransaction(payload);
    }
    navigation.goBack();
  }

  function handleDelete() {
    if (editingId) {
      deleteTransaction(editingId);
      navigation.goBack();
    }
  }

  return (
    <FormScreen
      title={editingId ? 'Edit Transaction' : 'Add Transaction'}
      onCancel={() => navigation.goBack()}
      onSave={handleSave}
      saveDisabled={!canSave}
      footer={<NumPad onKeyPress={handleKey} />}
      beforeContent={
        <>
          <View style={styles.typeSelector}>
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typePill, type === t && { backgroundColor: TYPE_COLORS[t] }]}
                onPress={() => {
                  setType(t);
                  setCategoryId(undefined);
                }}
              >
                <Text style={[styles.typePillText, type === t && { color: colors.background, fontWeight: '700' }]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.amountText, { color: TYPE_COLORS[type] }]}>{currencySymbol}{raw}</Text>
        </>
      }
    >
        {type !== 'TRANSFER' ? (
          <View style={styles.fieldColumns}>
            <View style={styles.fieldColumn}>
              <Text style={typography.label}>ACCOUNT</Text>
              <DropdownField
                placeholder="Select account"
                icon={selectedAccount?.icon}
                color={selectedAccount?.color}
                value={selectedAccount?.name}
                onPress={() => setActiveSheet('account')}
              />
            </View>
            <View style={styles.fieldColumn}>
              <Text style={typography.label}>CATEGORY</Text>
              <DropdownField
                placeholder="Select category"
                icon={selectedCategory?.icon}
                color={selectedCategory?.color}
                value={selectedCategory?.name}
                onPress={() => setActiveSheet('category')}
              />
            </View>
          </View>
        ) : (
          <View style={styles.fieldColumns}>
            <View style={styles.fieldColumn}>
              <Text style={typography.label}>FROM ACCOUNT</Text>
              <DropdownField
                placeholder="Select account"
                icon={selectedAccount?.icon}
                color={selectedAccount?.color}
                value={selectedAccount?.name}
                onPress={() => setActiveSheet('account')}
              />
            </View>
            <View style={styles.fieldColumn}>
              <Text style={typography.label}>TO ACCOUNT</Text>
              <DropdownField
                placeholder="Select account"
                icon={selectedToAccount?.icon}
                color={selectedToAccount?.color}
                value={selectedToAccount?.name}
                onPress={() => setActiveSheet('toAccount')}
              />
            </View>
          </View>
        )}

        {type !== 'TRANSFER' && activeEvents.length > 0 && (
          <>
            <Text style={[typography.label, { marginTop: 16 }]}>EVENT (OPTIONAL)</Text>
            <DropdownField
              placeholder="No event"
              icon={selectedEvent?.icon}
              color={selectedEvent?.color}
              value={selectedEvent?.name}
              onPress={() => setActiveSheet('event')}
            />
          </>
        )}

        <Text style={[typography.label, { marginTop: 16 }]}>DATE</Text>
        <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
          <MaterialCommunityIcons name="calendar" size={18} color={colors.textSecondary} />
          <Text style={typography.body}>{format(date, 'MMM d, yyyy - h:mm a')}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onValueChange={(_, selected) => {
              setShowDatePicker(false);
              setDate(selected);
              if (Platform.OS === 'android') setShowTimePicker(true);
            }}
            onDismiss={() => setShowDatePicker(false)}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={date}
            mode="time"
            display="default"
            onValueChange={(_, selected) => {
              setShowTimePicker(false);
              setDate(selected);
            }}
            onDismiss={() => setShowTimePicker(false)}
          />
        )}

        <Text style={[typography.label, { marginTop: 16 }]}>NOTE</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="Add a note"
          placeholderTextColor={colors.textSecondary}
          value={note}
          onChangeText={setNote}
        />

        {editingId && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={{ color: colors.expense, fontWeight: '700' }}>Delete Transaction</Text>
          </TouchableOpacity>
        )}

      <SelectSheet
        visible={activeSheet === 'category'}
        title="Select Category"
        options={categoryOptions}
        selectedId={categoryId}
        onSelect={setCategoryId}
        onClose={() => setActiveSheet(null)}
      />
      <SelectSheet
        visible={activeSheet === 'account'}
        title={type === 'TRANSFER' ? 'From Account' : 'Select Account'}
        options={accountOptions}
        selectedId={accountId}
        onSelect={(id) => {
          setAccountId(id);
          if (id === toAccountId) setToAccountId(undefined);
        }}
        onClose={() => setActiveSheet(null)}
      />
      <SelectSheet
        visible={activeSheet === 'toAccount'}
        title="To Account"
        options={toAccountSelectOptions}
        selectedId={toAccountId}
        onSelect={setToAccountId}
        onClose={() => setActiveSheet(null)}
      />
      <SelectSheet
        visible={activeSheet === 'event'}
        title="Select Event"
        options={eventOptions}
        selectedId={eventId ?? ''}
        onSelect={(id) => setEventId(id || undefined)}
        onClose={() => setActiveSheet(null)}
      />
    </FormScreen>
  );
}

function DropdownField({
  value,
  placeholder,
  icon,
  color,
  onPress,
}: {
  value?: string;
  placeholder: string;
  icon?: string;
  color?: string;
  onPress: () => void;
}) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.fieldRow} onPress={onPress}>
      <View style={styles.fieldRowLeft}>
        {icon && color ? <CategoryIcon icon={icon} color={color} size={28} /> : null}
        <Text
          style={[typography.body, !value && { color: colors.textSecondary }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {value ?? placeholder}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    typeSelector: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
    typePill: { flex: 1, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    typePillText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
    amountText: { textAlign: 'center', fontSize: 40, fontWeight: '700', marginVertical: 16 },
    fieldColumns: { flexDirection: 'row', gap: 12 },
    fieldColumn: { flex: 1, minWidth: 0 },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingVertical: 10,
      paddingHorizontal: 10,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fieldRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
    noteInput: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary },
    deleteButton: { alignItems: 'center', marginTop: 20, paddingVertical: 10 },
  });
}
