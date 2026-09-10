import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { TopHeader } from '@/components/TopHeader';
import { CategoryIcon } from '@/components/CategoryIcon';
import { FAB } from '@/components/FAB';
import { EmptyState } from '@/components/EmptyState';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { sumByType } from '@/utils/calculations';
import { formatCurrency } from '@/utils/formatCurrency';

export function EventsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { events, transactions } = useStore();

  const activeEvents = useMemo(
    () => events.filter((e) => !e.archived).sort((a, b) => a.name.localeCompare(b.name)),
    [events]
  );

  return (
    <View style={styles.container}>
      <TopHeader title="Events" />
      {activeEvents.length === 0 ? (
        <EmptyState icon="party-popper" message="No events yet. Create one to track a trip, wedding, or project separately." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {activeEvents.map((event) => {
            const eventTx = transactions.filter((t) => t.eventId === event.id);
            const expense = sumByType(eventTx, 'EXPENSE');
            const income = sumByType(eventTx, 'INCOME');
            return (
              <TouchableOpacity
                key={event.id}
                style={styles.row}
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
              >
                <CategoryIcon icon={event.icon} color={event.color} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={typography.body}>{event.name}</Text>
                  <Text style={typography.caption}>
                    Expense {formatCurrency(expense)} · Income {formatCurrency(income)}
                  </Text>
                </View>
                <TouchableOpacity hitSlop={8} onPress={() => navigation.navigate('EventForm', { eventId: event.id })}>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      <FAB onPress={() => navigation.navigate('EventForm', undefined)} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}
