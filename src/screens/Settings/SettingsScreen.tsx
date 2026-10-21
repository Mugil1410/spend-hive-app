import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { readFile } from '@dr.pogodin/react-native-fs';
import { errorCodes, isErrorWithCode, keepLocalCopy, pick, types } from '@react-native-documents/picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialDesignIcons as MaterialCommunityIcons } from '@react-native-vector-icons/material-design-icons/static';
import { useTheme } from '@/theme/ThemeContext';
import { TopHeader } from '@/components/TopHeader';
import { Card } from '@/components/Card';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { buildTransactionsCsv } from '@/utils/exportCsv';
import { setPendingRestoreText } from '@/utils/pendingRestore';
import { parseDbBackupJson, DbBackup } from '@/utils/dbBackup';
import { saveAndShare } from '@/utils/backupFile';
import { format } from 'date-fns';
import { useAppLock } from '@/security/appLockStore';
import { describeTimeout, METHOD_LABELS } from '@/security/AppLockService';

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
    resetAllData,
    deleteAllTransactions,
    importData,
  } = useStore();
  const lockEnabled = useAppLock((s) => s.enabled);
  const lockMethod = useAppLock((s) => s.method);
  const lockTimeout = useAppLock((s) => s.timeoutMinutes);

  async function handleExportTransactions() {
    try {
      const csv = buildTransactionsCsv({ transactions, accounts, categories, events, cashbookEntries, debtors });
      const fileName = `spendhive-transactions-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
      await saveAndShare(fileName, csv, 'text/csv', 'Export Transactions');
    } catch (e) {
      Alert.alert('Export Failed', 'Could not export transactions.');
    }
  }

  function handleBackup() {
    navigation.navigate('BackupEncrypt');
  }

  async function handleRestore() {
    try {
      const [picked] = await pick({ type: [types.json, types.plainText, types.allFiles] });
      const [copy] = await keepLocalCopy({
        files: [{ uri: picked.uri, fileName: picked.name ?? 'spendhive-backup.json' }],
        destination: 'cachesDirectory',
      });
      if (copy.status === 'error') throw new Error(copy.copyError);

      const text = await readFile(decodeURIComponent(copy.localUri.replace(/^file:\/\//, '')), 'utf8');

      // Plain JSON backups restore directly; encrypted backups ask for their password.
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
    } catch (e) {
      if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) return;
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
        <Text style={typography.label}>SECURITY</Text>
        <Card>
          <SettingsRow
            icon={lockEnabled ? 'lock-check-outline' : 'lock-open-variant-outline'}
            label="App Lock"
            description={
              lockEnabled && lockMethod
                ? `On · ${METHOD_LABELS[lockMethod]} · ${describeTimeout(lockTimeout)}`
                : 'Off · Protect Spend Hive with a PIN, passcode or pattern'
            }
            onPress={() => navigation.navigate('AppLockSettings')}
          />
        </Card>

        <Text style={[typography.label, { marginTop: 16 }]}>SYSTEM</Text>
        <Card>
          <SettingsRow
            icon="chart-box-outline"
            label="System Analytics"
            description="Live RAM, CPU, storage and network usage on this phone"
            onPress={() => navigation.navigate('SystemAnalytics')}
          />
        </Card>

        <Text style={[typography.label, { marginTop: 16 }]}>BACKUP</Text>
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
