import React, { useMemo, useState } from 'react';
import { Text, TextInput, StyleSheet, Alert, ActivityIndicator, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@/theme/ThemeContext';
import { FormScreen } from '@/components/FormScreen';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { buildDbBackupJson, parseDbBackupJson, DB_BACKUP_VERSION } from '@/utils/dbBackup';
import {
  encryptBackup,
  decryptBackup,
  parseEncryptedBackupContainer,
  BackupFormatError,
  BackupPasswordError,
} from '@/utils/backupCrypto';
import { takePendingRestoreText } from '@/utils/pendingRestore';
import { format } from 'date-fns';

const MIN_PASSWORD_LENGTH = 6;

export function BackupPasswordModal() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'BackupPassword'>>();
  const { mode } = route.params;
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
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
    importData,
  } = useStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const canSave =
    !busy &&
    password.length >= MIN_PASSWORD_LENGTH &&
    (mode === 'restore' || password === confirmPassword);

  async function handleBackup() {
    setBusy(true);
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
      const container = await encryptBackup(json, password, DB_BACKUP_VERSION);
      const fileName = `spendhive-backup-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.spendhivebackup`;
      const file = new File(Paths.document, fileName);
      file.create({ overwrite: true });
      file.write(JSON.stringify(container));

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Save SpendHive Backup',
        });
      } else {
        Alert.alert('Backup Saved', `Saved to ${file.uri}`);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Backup Failed', 'Could not create the encrypted backup.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    const text = takePendingRestoreText();
    if (!text) {
      Alert.alert('Restore Failed', 'No backup file was selected.');
      navigation.goBack();
      return;
    }
    setBusy(true);
    try {
      const container = parseEncryptedBackupContainer(text);
      const decryptedJson = await decryptBackup(container, password);
      const backup = parseDbBackupJson(decryptedJson);

      Alert.alert(
        'Restore Backup',
        `This will replace all current data with the backup (${backup.transactions.length} transactions, ${backup.accounts.length} accounts). Existing data is kept until this is confirmed. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: () => {
              importData(backup);
              Alert.alert('Restore Complete', 'Your data has been restored from the backup.');
              navigation.goBack();
            },
          },
        ]
      );
    } catch (e) {
      if (e instanceof BackupPasswordError) {
        Alert.alert('Incorrect Password', e.message);
      } else if (e instanceof BackupFormatError) {
        Alert.alert('Restore Failed', e.message);
        navigation.goBack();
      } else {
        Alert.alert('Restore Failed', 'Could not read this backup file.');
        navigation.goBack();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScreen
      title={mode === 'backup' ? 'Backup Password' : 'Enter Backup Password'}
      onCancel={() => navigation.goBack()}
      onSave={mode === 'backup' ? handleBackup : handleRestore}
      saveDisabled={!canSave}
      saveLabel={mode === 'backup' ? 'Create Backup' : 'Restore'}
    >
      <Text style={typography.caption}>
        {mode === 'backup'
          ? 'Choose a password to encrypt your backup. You will need this password to restore it later. SpendHive does not store this password anywhere.'
          : 'Enter the password used to create this backup.'}
      </Text>

      <Text style={[typography.label, { marginTop: 16 }]}>PASSWORD</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        autoFocus
      />

      {mode === 'backup' && (
        <>
          <Text style={[typography.label, { marginTop: 16 }]}>CONFIRM PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
          />
          {confirmPassword.length > 0 && confirmPassword !== password && (
            <Text style={[typography.caption, { color: colors.expense, marginTop: 6 }]}>Passwords don't match.</Text>
          )}
        </>
      )}

      {busy && (
        <View style={styles.busyRow}>
          <ActivityIndicator color={colors.gold} />
          <Text style={typography.caption}>{mode === 'backup' ? 'Encrypting...' : 'Decrypting...'}</Text>
        </View>
      )}
    </FormScreen>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
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
    busyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  });
}
