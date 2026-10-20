import React, { useMemo, useState } from 'react';
import { Text, TextInput, StyleSheet, Alert, ActivityIndicator, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format } from 'date-fns';
import { useTheme } from '@/theme/ThemeContext';
import { FormScreen } from '@/components/FormScreen';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { buildDbBackupJson, DB_BACKUP_VERSION } from '@/utils/dbBackup';
import { encryptBackup } from '@/utils/backupCrypto';
import { saveBackupFile } from '@/utils/backupFile';

const MIN_PASSWORD_LENGTH = 6;

/** Asks for a password, then writes a password-encrypted backup file. */
export function BackupEncryptModal() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSave = !busy && password.length >= MIN_PASSWORD_LENGTH && confirm === password;

  async function handleBackup() {
    setBusy(true);
    try {
      const s = useStore.getState();
      const json = buildDbBackupJson({
        accounts: s.accounts,
        categories: s.categories,
        transactions: s.transactions,
        budgets: s.budgets,
        cashbookEntries: s.cashbookEntries,
        debtors: s.debtors,
        events: s.events,
        themeMode: s.themeMode,
        currency: s.currency,
        notificationSettings: s.notificationSettings,
      });
      const container = await encryptBackup(json, password, DB_BACKUP_VERSION);
      const fileName = `spendhive-backup-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      await saveBackupFile(fileName, JSON.stringify(container));
      navigation.goBack();
    } catch {
      Alert.alert('Backup Failed', 'Could not create the backup.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScreen
      title="Encrypt Backup"
      onCancel={() => navigation.goBack()}
      onSave={handleBackup}
      saveDisabled={!canSave}
      saveLabel="Backup"
    >
      <Text style={typography.caption}>
        Your backup will be encrypted with this password. You will need it to restore. If you forget it, the backup
        cannot be recovered.
      </Text>

      <Text style={[typography.label, { marginTop: 16 }]}>PASSWORD</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        autoFocus
        editable={!busy}
      />
      {tooShort && <Text style={styles.error}>Use at least {MIN_PASSWORD_LENGTH} characters.</Text>}

      <Text style={[typography.label, { marginTop: 16 }]}>CONFIRM PASSWORD</Text>
      <TextInput
        style={styles.input}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        editable={!busy}
      />
      {mismatch && <Text style={styles.error}>Passwords do not match.</Text>}

      {busy && (
        <View style={styles.busyRow}>
          <ActivityIndicator color={colors.gold} />
          <Text style={typography.caption}>Encrypting...</Text>
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
    error: { marginTop: 6, fontSize: 12, color: colors.expense },
    busyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  });
}
