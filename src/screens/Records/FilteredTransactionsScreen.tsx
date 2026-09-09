import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@/theme/ThemeContext';
import { CategoryIcon } from '@/components/CategoryIcon';
import { EmptyState } from '@/components/EmptyState';
import { SummaryCard } from '@/components/SummaryCard';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { sumByType } from '@/utils/calculations';
import { formatSignedAmount } from '@/utils/formatCurrency';
import { format } from 'date-fns';

export function FilteredTransactionsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'FilteredTransactions'>>();
  const { accountId, categoryId, title } = route.params;
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { transactions, categories, accounts, deleteTransaction } = useStore();

  const filtered = useMemo(() => {
    const list = transactions.filter((t) =>
      accountId ? t.accountId === accountId || t.toAccountId === accountId : t.categoryId === categoryId
    );
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, accountId, categoryId]);

  const expense = sumByType(filtered, 'EXPENSE');
  const income = sumByType(filtered, 'INCOME');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={typography.h2}>{title}</Text>
        <View style={{ width: 26 }} />
      </View>

      <SummaryCard expense={expense} income={income} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={{ marginTop: 8 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<EmptyState icon="notebook-outline" message="No transactions found." />}
        renderItem={({ item }) => {
          const category = categories.find((c) => c.id === item.categoryId);
          const account = accounts.find((a) => a.id === item.accountId);
          return (
            <Swipeable
              renderRightActions={() => (
                <TouchableOpacity style={styles.deleteAction} onPress={() => deleteTransaction(item.id)}>
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color="#fff" />
                </TouchableOpacity>
              )}
            >
              <TouchableOpacity
                style={styles.row}
                onPress={() => navigation.navigate('QuickAdd', { transactionId: item.id })}
              >
                <CategoryIcon
                  icon={item.type === 'TRANSFER' ? 'swap-horizontal' : category?.icon ?? 'help'}
                  color={item.type === 'TRANSFER' ? colors.gold : category?.color ?? colors.textSecondary}
                />
                <View style={styles.rowMiddle}>
                  <Text style={typography.body}>
                    {item.type === 'TRANSFER' ? 'Transfer' : category?.name ?? 'Uncategorized'}
                  </Text>
                  <View style={styles.rowSub}>
                    <View style={styles.accountBadge}>
                      <Text style={styles.accountBadgeText}>{account?.name ?? '—'}</Text>
                    </View>
                    <Text style={typography.caption}>{format(new Date(item.date), 'MMM d, yyyy')}</Text>
                    {!!item.note && (
                      <Text style={typography.caption} numberOfLines={1}>
                        · {item.note}
                      </Text>
                    )}
                  </View>
                </View>
                <Text
                  style={[
                    typography.amount,
                    { color: item.type === 'EXPENSE' ? colors.expense : item.type === 'INCOME' ? colors.income : colors.textPrimary },
                  ]}
                >
                  {formatSignedAmount(item.amount, item.type)}
                </Text>
              </TouchableOpacity>
            </Swipeable>
          );
        }}
      />
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.background,
    },
    rowMiddle: { flex: 1, gap: 4 },
    rowSub: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    accountBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    accountBadgeText: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
    deleteAction: {
      backgroundColor: colors.expense,
      justifyContent: 'center',
      alignItems: 'center',
      width: 72,
    },
  });
}
