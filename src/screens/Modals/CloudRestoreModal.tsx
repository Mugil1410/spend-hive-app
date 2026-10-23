import React, { useEffect, useMemo, useState } from 'react';
import { Text, TextInput, StyleSheet, Alert, ActivityIndicator, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialDesignIcons as MaterialCommunityIcons } from '@react-native-vector-icons/material-design-icons/static';
import { format } from 'date-fns';
import { useTheme } from '@/theme/ThemeContext';
import { FormScreen } from '@/components/FormScreen';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { parseDbBackupJson } from '@/utils/dbBackup';
import { decryptBackup, parseEncryptedBackupContainer, BackupPasswordError } from '@/utils/backupCrypto';
import {
  CloudBackupSummary,
  cloudErrorMessage,
  CloudCredentials,
  deleteCloudBackup,
  downloadCloudBackup,
  ensureOnline,
  getSavedCloudEmail,
  isValidEmail,
  listCloudBackups,
  MAX_CLOUD_BACKUPS,
} from '@/services/cloudBackup';

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Step 1: this phone's backups (by device ID) or an email's, plus the password, to list them.
 * Step 2: pick one and restore it.
 */
export function CloudRestoreModal() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const importData = useStore((s) => s.importData);

  const [source, setSource] = useState<'device' | 'email'>('device');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [backups, setBackups] = useState<CloudBackupSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getSavedCloudEmail().then((saved) => setEmail((current) => current || saved));
  }, []);

  const credentials: CloudCredentials = { email: source === 'email' ? email : '', password };
  const listed = backups !== null;
  const canFind = !busy && (source === 'device' || isValidEmail(email)) && password.length > 0;
  const canRestore = !busy && !!selectedId;

  async function handleFind() {
    if (!(await ensureOnline())) return;
    setBusy('Fetching your cloud backups...');
    try {
      const list = await listCloudBackups(credentials);
      setBackups(list);
      setSelectedId(list[0]?.id ?? null);
    } catch (e) {
      Alert.alert('Cloud Restore', cloudErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleRestore() {
    if (!selectedId || !(await ensureOnline())) return;
    setBusy('Downloading and decrypting...');
    try {
      const payload = await downloadCloudBackup(credentials, selectedId);
      const container = parseEncryptedBackupContainer(payload);
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
        `This will replace all current data with the backup (${backup.transactions.length} transactions, ${backup.accounts.length} accounts). Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: () => {
              importData(backup);
              Alert.alert('Restore Complete', 'Your data has been restored from the cloud backup.');
              navigation.goBack();
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Restore Failed', e instanceof Error && !(e as any).isAxiosError ? e.message : cloudErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  function handleDelete(item: CloudBackupSummary) {
    Alert.alert('Delete Cloud Backup', `Delete the backup from ${format(new Date(item.createdAt), 'dd MMM yyyy, hh:mm a')}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!(await ensureOnline())) return;
          setBusy('Deleting...');
          try {
            const list = await deleteCloudBackup(credentials, item.id);
            setBackups(list);
            setSelectedId((current) => (list.some((b) => b.id === current) ? current : list[0]?.id ?? null));
          } catch (e) {
            Alert.alert('Delete Failed', cloudErrorMessage(e));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  return (
    <FormScreen
      title="Restore from Cloud"
      onCancel={() => navigation.goBack()}
      onSave={listed ? handleRestore : handleFind}
      saveDisabled={listed ? !canRestore : !canFind}
      saveLabel={listed ? 'Restore' : 'Find'}
    >
      {!listed ? (
        <>
          <View style={styles.segment}>
            {(['device', 'email'] as const).map((value) => (
              <TouchableOpacity
                key={value}
                style={[styles.segmentItem, source === value && { backgroundColor: colors.gold }]}
                onPress={() => setSource(value)}
                disabled={!!busy}
              >
                <Text style={[styles.segmentText, source === value && { color: colors.background }]}>
                  {value === 'device' ? 'This Phone' : 'Email'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[typography.caption, { marginTop: 12 }]}>
            {source === 'device'
              ? 'Backups made on this phone without an email. Enter the password you used for them.'
              : 'Backups made with an email. Enter the email and password you used. This works on any phone.'}
          </Text>

          {source === 'email' && (
            <>
              <Text style={[typography.label, { marginTop: 16 }]}>EMAIL</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!busy}
              />
            </>
          )}

          <Text style={[typography.label, { marginTop: 16 }]}>BACKUP PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            editable={!busy}
          />
        </>
      ) : (
        <>
          <View style={styles.listHeader}>
            <Text style={[typography.caption, { flex: 1 }]}>
              {source === 'email' ? email.trim() : 'This phone'} · {backups.length} of {MAX_CLOUD_BACKUPS} backups
            </Text>
            <TouchableOpacity onPress={() => setBackups(null)} disabled={!!busy}>
              <Text style={styles.link}>Change</Text>
            </TouchableOpacity>
          </View>

          {backups.length === 0 && (
            <Text style={[typography.caption, { marginTop: 16 }]}>No cloud backups are stored for {source === 'email' ? 'this email' : 'this phone'}.</Text>
          )}

          {backups.map((item, index) => {
            const selected = item.id === selectedId;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.item, selected && { borderColor: colors.gold }]}
                onPress={() => setSelectedId(item.id)}
                disabled={!!busy}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                  size={22}
                  color={selected ? colors.gold : colors.textSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={typography.body}>
                    {format(new Date(item.createdAt), 'dd MMM yyyy, hh:mm a')}
                    {index === 0 ? '  · Latest' : ''}
                  </Text>
                  <Text style={typography.caption}>
                    {item.deviceName} · v{item.appVersion} · {formatSize(item.sizeBytes)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={10} disabled={!!busy} accessibilityLabel="Delete backup">
                  <MaterialCommunityIcons name="delete-outline" size={22} color={colors.expense} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {busy && (
        <View style={styles.busyRow}>
          <ActivityIndicator color={colors.gold} />
          <Text style={typography.caption}>{busy}</Text>
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
    segment: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 3,
    },
    segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
    segmentText: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
    listHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    link: { color: colors.gold, fontSize: 14, fontWeight: '700' },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 10,
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    busyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  });
}
