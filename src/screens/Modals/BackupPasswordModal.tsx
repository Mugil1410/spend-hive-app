import React, { useMemo, useState } from 'react';
import { Text, TextInput, StyleSheet, Alert, ActivityIndicator, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@/theme/ThemeContext';
import { FormScreen } from '@/components/FormScreen';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { parseDbBackupJson } from '@/utils/dbBackup';
import {
  decryptBackup,
  parseEncryptedBackupContainer,
  BackupFormatError,
  BackupPasswordError,
} from '@/utils/backupCrypto';
import { takePendingRestoreText } from '@/utils/pendingRestore';

/**
 * Unlocks a legacy password-protected backup (made by older app versions). New backups are
 * plain JSON and restore straight from Settings without this screen.
 */
export function BackupPasswordModal() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const importData = useStore((s) => s.importData);

  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

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
      let decryptedJson: string;
      try {
        decryptedJson = await decryptBackup(container, password);
      } catch (e) {
        // Keyboards often add a trailing space; retry once with the trimmed password.
        if (!(e instanceof BackupPasswordError) || password.trim() === password) throw e;
        decryptedJson = await decryptBackup(container, password.trim());
      }
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
        Alert.alert('Restore Failed', `Could not read this backup file.\n\n${e instanceof Error ? e.message : String(e)}`);
        navigation.goBack();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScreen
      title="Enter Backup Password"
      onCancel={() => navigation.goBack()}
      onSave={handleRestore}
      saveDisabled={busy || password.length === 0}
      saveLabel="Restore"
    >
      <Text style={typography.caption}>
        This backup was made by an older version of SpendHive and is password-protected. Enter the password used to
        create it.
      </Text>

      <Text style={[typography.label, { marginTop: 16 }]}>PASSWORD</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholderTextColor={colors.textSecondary}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        autoFocus
      />

      {busy && (
        <View style={styles.busyRow}>
          <ActivityIndicator color={colors.gold} />
          <Text style={typography.caption}>Decrypting...</Text>
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
