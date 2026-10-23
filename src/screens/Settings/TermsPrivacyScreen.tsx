import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialDesignIcons as MaterialCommunityIcons } from '@react-native-vector-icons/material-design-icons/static';
import DeviceInfo from 'react-native-device-info';
import { useTheme } from '@/theme/ThemeContext';
import { Card } from '@/components/Card';
import { StackHeader } from '@/components/StackHeader';

const LAST_UPDATED = '23 October 2026';

interface Section {
  icon: string;
  title: string;
  intro?: string;
  items: { label?: string; text: string }[];
}

const SECTIONS: Section[] = [
  {
    icon: 'shield-check-outline',
    title: 'Overview',
    items: [
      {
        text: 'Spend Hive is an offline-first finance tracker. Your transactions, accounts, categories, budgets, cashbook entries and events are stored only on this phone. The app works fully without an internet connection.',
      },
      {
        text: 'The app only goes online to check for updates, and to upload or download cloud backups if you choose to use them.',
      },
    ],
  },
  {
    icon: 'server-network',
    title: 'Services we use and why',
    items: [
      {
        label: 'Spend Hive server (spend-hive-api.vercel.app, hosted on Vercel)',
        text: 'Issues short-lived access tokens to the app, tells the app about the latest version, and stores optional cloud backups.',
      },
      {
        label: 'MongoDB database (used by the Spend Hive server)',
        text: 'Holds the list of app releases and, only if you use cloud backup, your encrypted backups.',
      },
      {
        label: 'Your web browser',
        text: 'Tapping Update opens the download link for the new version in your browser.',
      },
      {
        label: 'Android Keystore and biometric / screen-lock prompt (on this phone)',
        text: 'Protect your App Lock PIN, passcode or pattern, and unlock the app with your fingerprint, face or screen lock. Nothing is sent anywhere.',
      },
      {
        label: 'Notifee local notifications (on this phone)',
        text: 'Schedule reminders such as the daily spending reminder and loan or payment due dates. Notifications are created on the phone, not sent from a server.',
      },
      {
        label: 'Android system information (on this phone)',
        text: 'The System Analytics screen reads RAM, CPU, storage and network usage to show them to you.',
      },
    ],
  },
  {
    icon: 'database-eye-outline',
    title: 'Data sent to our server',
    intro: 'Only the following leaves your phone:',
    items: [
      {
        label: 'Device identifier',
        text: 'An app-specific ID that Android provides. It is sent when the app requests an access token, and with cloud backups, which are linked to it unless you give an email.',
      },
      {
        label: 'Version check',
        text: 'The app asks the server for the latest version number. The comparison with your installed version is done on the phone.',
      },
      {
        label: 'Cloud backup (optional, only when you use it)',
        text: 'The encrypted backup file, your device identifier, your email address if you choose to give one, your phone brand and model, the app version, the backup size and the time it was made. Up to 3 backups are kept for each phone or email.',
      },
      {
        label: 'Standard request logs',
        text: 'Like any web service, the hosting provider may record technical details of each request, such as IP address and time, for security and reliability.',
      },
    ],
  },
  {
    icon: 'lock-outline',
    title: 'How cloud backups are protected',
    items: [
      {
        text: 'Backups are encrypted on your phone with AES-256-GCM using a key derived from your password (Argon2id) before they are uploaded. The server stores only the encrypted file and cannot read it.',
      },
      {
        text: 'Your password is never sent. The app sends a separate key derived from your device identifier (or email) and password, which the server stores only as a salted hash to check that later requests come from you. Repeated wrong attempts are temporarily blocked.',
      },
      {
        text: 'If you forget your backup password, neither you nor we can recover the backup.',
      },
    ],
  },
  {
    icon: 'eye-off-outline',
    title: 'What we do not collect',
    items: [
      { text: 'Your financial records are never sent to us, except inside an encrypted cloud backup you choose to make.' },
      { text: 'Your App Lock PIN, passcode, pattern or biometrics.' },
      { text: 'System Analytics readings (RAM, CPU, storage, network). They are shown to you and never sent.' },
      { text: 'Location, contacts, SMS, call logs, photos, camera or microphone.' },
      { text: 'There are no ads, advertising IDs, or third-party analytics or tracking SDKs in the app.' },
    ],
  },
  {
    icon: 'cellphone-key',
    title: 'Permissions',
    items: [
      { label: 'Internet', text: 'Version checks and optional cloud backup.' },
      { label: 'Network state', text: 'Shows your connection type on the System Analytics screen.' },
      { label: 'Notifications', text: 'Shows the reminders you set up. You can turn this off in Android settings.' },
      { label: 'Vibration', text: 'Lets reminder notifications vibrate the phone.' },
    ],
  },
  {
    icon: 'account-cog-outline',
    title: 'Your choices',
    items: [
      { text: 'Cloud backup is optional, and so is giving an email. Without an email, cloud backups can only be restored on the same phone; a factory reset changes its device identifier. Local backup files work without any account.' },
      {
        text: 'Delete any cloud backup from Settings → Restore from Cloud. When you delete the last one for a phone or email, its sign-in record is removed from our server too.',
      },
      { text: 'Settings → Reset All erases all data on this phone. Uninstalling the app also removes it.' },
      { text: 'Android cloud backup of app data is turned off, so your records are not copied to your Google account.' },
    ],
  },
  {
    icon: 'file-document-outline',
    title: 'Terms of use',
    items: [
      {
        text: 'Spend Hive is provided "as is", without warranties of any kind. It is a personal record-keeping tool and does not give financial, tax or legal advice.',
      },
      {
        text: 'You are responsible for the accuracy of the data you enter, and for keeping your backups and backup passwords safe. We are not liable for data lost because of device loss, uninstalling the app, a forgotten password or a reset.',
      },
      {
        text: 'Some updates may be required to keep using the app, for example for security fixes. Updating keeps your data.',
      },
      {
        text: 'Cloud backup storage is offered free of charge and may be limited or changed. Keep a local backup of anything important.',
      },
      {
        text: 'Do not misuse the Spend Hive server, for example by trying to access backups that are not yours.',
      },
      {
        text: 'We may update these terms. The date below shows the latest version; continuing to use the app means you accept the changes.',
      },
    ],
  },
];

export function TermsPrivacyScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <StackHeader title="Terms & Privacy" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name={section.icon as any} size={22} color={colors.gold} />
              <Text style={[typography.h2, { flex: 1 }]}>{section.title}</Text>
            </View>
            {section.intro && <Text style={[typography.body, styles.paragraph]}>{section.intro}</Text>}
            {section.items.map((item, i) => (
              <View key={i} style={styles.item}>
                <Text style={[typography.body, styles.bullet]}>•</Text>
                <Text style={[typography.body, styles.itemText]}>
                  {item.label && <Text style={styles.label}>{item.label}: </Text>}
                  {item.text}
                </Text>
              </View>
            ))}
          </Card>
        ))}
        <Text style={[typography.caption, styles.footer]}>
          Spend Hive v{DeviceInfo.getVersion()} · Last updated {LAST_UPDATED}
        </Text>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    paragraph: { marginTop: 4 },
    item: { flexDirection: 'row', gap: 8, marginTop: 8 },
    bullet: { color: colors.gold },
    itemText: { flex: 1, lineHeight: 21 },
    label: { fontWeight: '700', color: colors.textPrimary },
    footer: { textAlign: 'center', marginTop: 8 },
  });
}
