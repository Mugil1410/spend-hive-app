import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { TopHeader } from '@/components/TopHeader';
import { Card } from '@/components/Card';
import { useStore } from '@/store/useStore';
import { buildExportWorkbookBytes } from '@/utils/exportExcel';
import { format } from 'date-fns';

export function SettingsScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { accounts, categories, transactions, budgets, cashbookEntries, resetToSeed, deleteAllTransactions } =
    useStore();

  async function handleExport() {
    try {
      const bytes = buildExportWorkbookBytes({ accounts, categories, transactions, budgets, cashbookEntries });
      const fileName = `spendhive-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.xlsx`;
      const file = new File(Paths.document, fileName);
      file.create({ overwrite: true });
      file.write(bytes);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Export SpendHive Data',
        });
      } else {
        Alert.alert('Export Saved', `Saved to ${file.uri}`);
      }
    } catch (e) {
      Alert.alert('Export Failed', 'Could not export data file.');
    }
  }

  function handleResetAll() {
    Alert.alert('Reset All Data', 'This will erase all data and restore the default demo data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset All', style: 'destructive', onPress: resetToSeed },
    ]);
  }

  function handleDeleteAllTransactions() {
    Alert.alert(
      'Delete All Transactions',
      'This will permanently erase all transactions. Accounts, categories, budgets, and cashbook entries are kept. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete All', style: 'destructive', onPress: deleteAllTransactions },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <TopHeader title="Settings" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={typography.label}>EXPORT</Text>
        <Card>
          <SettingsRow
            icon="microsoft-excel"
            label="Export to Excel"
            description="Save all your data as a multi-sheet .xlsx file"
            onPress={handleExport}
          />
        </Card>

        <Text style={[typography.label, { marginTop: 16 }]}>DANGER ZONE</Text>
        <Card>
          <SettingsRow
            icon="restore"
            label="Reset All"
            description="Erase all data and reload sample data"
            danger
            onPress={handleResetAll}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="delete-sweep-outline"
            label="Delete All Transactions"
            description="Erase transactions only, keep accounts and categories"
            danger
            onPress={handleDeleteAllTransactions}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  description,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  description: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <MaterialCommunityIcons name={icon as any} size={22} color={danger ? colors.expense : colors.gold} />
      <View style={{ flex: 1 }}>
        <Text style={[typography.body, danger && { color: colors.expense }]}>{label}</Text>
        <Text style={typography.caption}>{description}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    divider: { height: 1, backgroundColor: colors.separator, marginVertical: 4 },
  });
}
