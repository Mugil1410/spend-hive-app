import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { TopHeader } from '@/components/TopHeader';
import { Card } from '@/components/Card';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { buildTransactionsCsv } from '@/utils/exportCsv';
import { setPendingRestoreText } from '@/utils/pendingRestore';
import { buildDbBackupJson, parseDbBackupJson, DbBackup } from '@/utils/dbBackup';
import { format } from 'date-fns';

/**
 * Lets the user pick a folder (Android's Storage Access Framework folder picker doubles as the
 * permission prompt) and writes the backup there directly. Returns false if the user cancels or
 * the picker/write fails, so the caller can fall back to the sandboxed file + share sheet.
 */
async function saveToChosenFolder(fileName: string, contents: string): Promise<boolean> {
  try {
    const dir = await Directory.pickDirectoryAsync();
    dir.createFile(fileName, 'application/json').write(contents);
    Alert.alert('Backup Saved', 'Your backup was saved to the selected folder.');
    return true;
  } catch {
    return false;
  }
}

/** Writes to the app's sandboxed documents dir and opens the share sheet (or reports the path if sharing is unavailable). */
async function saveAndShare(fileName: string, contents: string, mimeType: string, dialogTitle: string, savedTitle: string) {
  const file = new File(Paths.document, fileName);
  file.create({ overwrite: true });
  file.write(contents);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
  } else {
    Alert.alert(savedTitle, `Saved to ${file.uri}`);
  }
}

function tryParsePlainBackup(text: string): DbBackup | null {
  try {
    const data = JSON.parse(text.replace(/^﻿/, ''));
    if (data?.container === 'spendhive-encrypted-backup') return null;
    return parseDbBackupJson(JSON.stringify(data));
  } catch {
    return null;
  }
}

export function SettingsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    accounts,
    categories,
    transactions,
    events,
    cashbookEntries,
    debtors,
    budgets,
    themeMode,
    currency,
    notificationSettings,
    resetAllData,
    deleteAllTransactions,
    importData,
  } = useStore();

  async function handleExportTransactions() {
    try {
      const csv = buildTransactionsCsv({ transactions, accounts, categories, events, cashbookEntries, debtors });
      const fileName = `spendhive-transactions-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
      await saveAndShare(fileName, csv, 'text/csv', 'Export Transactions', 'Export Saved');
    } catch (e) {
      Alert.alert('Export Failed', 'Could not export transactions.');
    }
  }

  async function handleBackup() {
    try {
      const json = buildDbBackupJson({
        accounts,
        categories,
        transactions,
        budgets,
        cashbookEntries,
        debtors,
        events,
        themeMode,
        currency,
        notificationSettings,
      });
      const baseName = `spendhive-backup-${format(new Date(), 'yyyy-MM-dd-HHmmss')}`;

      if (Platform.OS === 'android' && (await saveToChosenFolder(`${baseName}.json`, json))) return;

      await saveAndShare(`${baseName}.json`, json, 'application/json', 'Save SpendHive Backup', 'Backup Saved');
    } catch {
      Alert.alert('Backup Failed', 'Could not create the backup.');
    }
  }

  async function handleRestore() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const text = await new File(result.assets[0].uri).text();

      // Plain JSON backups restore directly; only legacy encrypted backups need a password.
      const plain = tryParsePlainBackup(text);
      if (plain) {
        Alert.alert(
          'Restore Backup',
          `This will replace all current data with the backup (${plain.transactions.length} transactions, ${plain.accounts.length} accounts). Continue?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Restore',
              style: 'destructive',
              onPress: () => {
                importData(plain);
                Alert.alert('Restore Complete', 'Your data has been restored from the backup.');
              },
            },
          ]
        );
        return;
      }

      setPendingRestoreText(text);
      navigation.navigate('BackupPassword');
    } catch {
      Alert.alert('Restore Failed', 'Could not read the selected file.');
    }
  }

  function handleResetAll() {
    Alert.alert('Reset All Data', 'This will permanently erase all data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset All', style: 'destructive', onPress: resetAllData },
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
            icon="content-save-outline"
            label="Backup"
            description="Save a backup file of your data"
            onPress={handleBackup}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="backup-restore"
            label="Restore"
            description="Restore your data from a backup file"
            onPress={handleRestore}
          />
        </Card>

        <Text style={[typography.label, { marginTop: 16 }]}>EXPORT</Text>
        <Card>
          <SettingsRow
            icon="microsoft-excel"
            label="Export Transactions to Excel"
            description="Save your transactions as a .csv file (opens in Excel)"
            onPress={handleExportTransactions}
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
