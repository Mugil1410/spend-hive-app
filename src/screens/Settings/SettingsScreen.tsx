import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { pick, keepLocalCopy, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/theme/ThemeContext';
import { TopHeader } from '@/components/TopHeader';
import { Card } from '@/components/Card';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { buildTransactionsWorkbookBytes } from '@/utils/exportExcel';
import { setPendingRestoreText } from '@/utils/pendingRestore';
import { bytesToBase64 } from '@/utils/base64';
import { format } from 'date-fns';

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
  } = useStore();

  async function handleExportTransactions() {
    try {
      const bytes = buildTransactionsWorkbookBytes({ transactions, accounts, categories, events, cashbookEntries, debtors });
      const fileName = `spendhive-transactions-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.xlsx`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      await RNFS.writeFile(filePath, bytesToBase64(bytes), 'base64');

      try {
        await Share.open({
          url: `file://${filePath}`,
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          title: 'Export Transactions',
          failOnCancel: false,
        });
      } catch {
        Alert.alert('Export Saved', `Saved to ${filePath}`);
      }
    } catch (e) {
      Alert.alert('Export Failed', 'Could not export transactions.');
    }
  }

  function handleBackup() {
    navigation.navigate('BackupPassword', { mode: 'backup' });
  }

  async function handleRestore() {
    try {
      const [pickedFile] = await pick({
        type: [types.json, types.plainText, types.allFiles],
      });
      const [copy] = await keepLocalCopy({
        files: [{ uri: pickedFile.uri, fileName: pickedFile.name ?? 'backup' }],
        destination: 'cachesDirectory',
      });
      if (copy.status !== 'success') {
        Alert.alert('Restore Failed', 'Could not read the selected file.');
        return;
      }

      const text = await RNFS.readFile(copy.localUri, 'utf8');
      setPendingRestoreText(text);
      navigation.navigate('BackupPassword', { mode: 'restore' });
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
        <Text style={typography.label}>BACKUP</Text>
        <Card>
          <SettingsRow
            icon="shield-lock-outline"
            label="Backup"
            description="Save an encrypted, password-protected backup of your data"
            onPress={handleBackup}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="backup-restore"
            label="Restore"
            description="Restore your data from an encrypted backup"
            onPress={handleRestore}
          />
        </Card>

        <Text style={[typography.label, { marginTop: 16 }]}>EXPORT</Text>
        <Card>
          <SettingsRow
            icon="microsoft-excel"
            label="Export Transactions to Excel"
            description="Save your transactions as a .xlsx file"
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
