import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { readAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { TopHeader } from '@/components/TopHeader';
import { Card } from '@/components/Card';
import { useStore } from '@/store/useStore';
import { buildExportWorkbookBytes } from '@/utils/exportExcel';
import { buildDbBackupJson, parseDbBackupJson } from '@/utils/dbBackup';
import { format } from 'date-fns';

export function SettingsScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    accounts,
    categories,
    transactions,
    budgets,
    cashbookEntries,
    themeMode,
    currency,
    notificationSettings,
    resetToSeed,
    deleteAllTransactions,
    importData,
  } = useStore();

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

  async function handleExportDb() {
    try {
      const json = buildDbBackupJson({ accounts, categories, transactions, budgets, cashbookEntries, themeMode, currency, notificationSettings });
      const fileName = `spendhive-db-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      const file = new File(Paths.document, fileName);
      file.create({ overwrite: true });
      file.write(json);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export SpendHive DB File',
        });
      } else {
        Alert.alert('Export Saved', `Saved to ${file.uri}`);
      }
    } catch (e) {
      Alert.alert('Export Failed', 'Could not export the DB file.');
    }
  }

  async function handleImportDb() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const text = await readAsStringAsync(result.assets[0].uri);
      const backup = parseDbBackupJson(text);

      Alert.alert(
        'Import DB File',
        `This will replace all current data with the backup (${backup.transactions.length} transactions, ${backup.accounts.length} accounts). Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            style: 'destructive',
            onPress: () => {
              importData(backup);
              Alert.alert('Import Complete', 'Your data has been restored from the DB file.');
            },
          },
        ]
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      Alert.alert('Import Failed', `Could not read this file. Make sure it is a SpendHive DB backup (.json).\n\n${message}`);
    }
  }

  function handleResetAll() {
    Alert.alert('Reset All Data', 'This will permanently erase all data. Continue?', [
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
        <Text style={typography.label}>BACKUP</Text>
        <Card>
          <SettingsRow
            icon="database-export-outline"
            label="Export DB File"
            description="Save all your data as a .json backup file"
            onPress={handleExportDb}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="database-import-outline"
            label="Import DB File"
            description="Restore your data from a previously exported .json backup"
            onPress={handleImportDb}
          />
        </Card>

        <Text style={[typography.label, { marginTop: 16 }]}>EXPORT</Text>
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
            description="Erase all data"
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
