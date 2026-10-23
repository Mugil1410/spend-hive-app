import React, { useEffect, useMemo, useState } from 'react';
import { Text, TextInput, StyleSheet, Alert, ActivityIndicator, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format } from 'date-fns';
import { useTheme } from '@/theme/ThemeContext';
import { FormScreen } from '@/components/FormScreen';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { buildDbBackupJson, DB_BACKUP_VERSION } from '@/utils/dbBackup';
import { encryptBackup } from '@/utils/backupCrypto';
import { saveBackupFile } from '@/utils/backupFile';
import {
  CloudBackupLimitError,
  CloudBackupSummary,
  cloudErrorMessage,
  ensureOnline,
  getSavedCloudEmail,
  isValidEmail,
  listCloudBackups,
  MAX_CLOUD_BACKUPS,
  uploadCloudBackup,
} from '@/services/cloudBackup';

const MIN_PASSWORD_LENGTH = 6;

/** Asks with an Alert whether to replace the oldest cloud backup; resolves its id, or null to cancel. */
function confirmReplaceOldest(backups: CloudBackupSummary[]): Promise<string | null> {
  const oldest = [...backups].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (!oldest) return Promise.resolve(null);
  return new Promise((resolve) =>
    Alert.alert(
      'Cloud Backup Limit',
      `You can keep up to ${MAX_CLOUD_BACKUPS} cloud backups. Replace the oldest one (${format(
        new Date(oldest.createdAt),
        'dd MMM yyyy, hh:mm a'
      )})?

You can also delete specific backups from Restore from Cloud.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'Replace Oldest', style: 'destructive', onPress: () => resolve(oldest.id) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    )
  );
}

/** Asks for a password, then writes a password-encrypted backup to a file or to the cloud. */
export function BackupEncryptModal() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const cloud = useRoute<RouteProp<RootStackParamList, 'BackupEncrypt'>>().params?.target === 'cloud';
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cloud) getSavedCloudEmail().then((saved) => setEmail((current) => current || saved));
  }, [cloud]);

  const emailInvalid = cloud && email.length > 0 && !isValidEmail(email);
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSave =
    !busy && password.length >= MIN_PASSWORD_LENGTH && confirm === password && (!cloud || email.trim() === '' || isValidEmail(email));

  async function handleBackup() {
    if (cloud && !(await ensureOnline())) return;
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
      if (cloud) {
        await uploadToCloud(JSON.stringify(container));
        return;
      }
      const fileName = `spendhive-backup-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      await saveBackupFile(fileName, JSON.stringify(container));
      navigation.goBack();
    } catch (e) {
      Alert.alert('Backup Failed', cloud ? cloudErrorMessage(e) : 'Could not create the backup.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadToCloud(payload: string) {
    const credentials = { email, password };
    let backups: CloudBackupSummary[];
    try {
      backups = await uploadCloudBackup(credentials, payload);
    } catch (e) {
      if (!(e instanceof CloudBackupLimitError)) throw e;
      const replaceId = await confirmReplaceOldest(await listCloudBackups(credentials));
      if (!replaceId) return;
      backups = await uploadCloudBackup(credentials, payload, replaceId);
    }
    Alert.alert(
      'Backup Uploaded',
      `Your encrypted backup is saved to the cloud (${backups.length} of ${MAX_CLOUD_BACKUPS} used). ` +
        (email.trim()
          ? `Restore it on any phone with ${email.trim()} and this password.`
          : 'It is linked to this phone. Restore it here with this password, or add an email next time to restore on a new phone.')
    );
    navigation.goBack();
  }

  return (
    <FormScreen
      title={cloud ? 'Cloud Backup' : 'Encrypt Backup'}
      onCancel={() => navigation.goBack()}
      onSave={handleBackup}
      saveDisabled={!canSave}
      saveLabel={cloud ? 'Upload' : 'Backup'}
    >
      <Text style={typography.caption}>
        Your backup will be encrypted with this password. You will need it to restore. If you forget it, the backup
        cannot be recovered.
      </Text>

      {cloud && (
        <>
          <Text style={[typography.caption, { marginTop: 8 }]}>
            The encrypted file is stored on the Spend Hive server, linked to this phone's device ID. Add an email
            (optional) to link it to the email instead, so you can restore it if you change phones. Up to{' '}
            {MAX_CLOUD_BACKUPS} backups are kept for this phone or email, all with the same password. Your password never
            leaves this phone. See Settings → Terms & Privacy.
          </Text>

          <Text style={[typography.label, { marginTop: 16 }]}>EMAIL (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Leave empty to link to this phone"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!busy}
          />
          {emailInvalid && <Text style={styles.error}>Enter a valid email address.</Text>}
        </>
      )}

      <Text style={[typography.label, { marginTop: 16 }]}>PASSWORD</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        autoFocus={!cloud}
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
          <Text style={typography.caption}>{cloud ? 'Encrypting and uploading...' : 'Encrypting...'}</Text>
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
