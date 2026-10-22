import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, TextInput, Linking, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialDesignIcons as MaterialCommunityIcons } from '@react-native-vector-icons/material-design-icons/static';
import { useTheme } from '@/theme/ThemeContext';
import { radius } from '@/theme/colors';
import { Card } from '@/components/Card';
import { StackHeader } from '@/components/StackHeader';
import { RootStackParamList } from '@/navigation/types';
import { CustomLockMethod, useAppLock } from '@/security/appLockStore';
import {
  authenticateWithDevice,
  describeTimeout,
  enableDeviceLock,
  isCustomMethod,
  METHOD_LABELS,
  TIMEOUT_PRESETS,
  validateCustomTimeout,
} from '@/security/AppLockService';
import { DeviceAuthStatus, SecureStore } from '@/native/SecureStore';

const CUSTOM_METHODS: { method: CustomLockMethod; icon: string; hint: string }[] = [
  { method: 'pin', icon: 'dialpad', hint: '4–6 digits' },
  { method: 'passcode', icon: 'form-textbox-password', hint: 'Letters & numbers' },
  { method: 'pattern', icon: 'gesture', hint: 'Connect 4+ dots' },
];

export function AppLockSettingsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { enabled, method, timeoutMinutes } = useAppLock();

  const [choosing, setChoosing] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<DeviceAuthStatus | null>(null);
  const isCustomTimeout = !TIMEOUT_PRESETS.some((p) => p.minutes === timeoutMinutes);
  const [customOpen, setCustomOpen] = useState(isCustomTimeout);
  const [customText, setCustomText] = useState(isCustomTimeout ? String(timeoutMinutes) : '');
  const [customError, setCustomError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setChoosing(false);
      SecureStore.getDeviceAuthStatus().then(setDeviceStatus).catch(() => setDeviceStatus(null));
    }, [])
  );

  const deviceAvailable = !!deviceStatus?.available;

  function handleToggle(value: boolean) {
    if (value) setChoosing(true);
    else if (enabled) navigation.navigate('AppLockSetup', { intent: 'disable' });
    else setChoosing(false);
  }

  async function handlePickDevice() {
    if (!deviceAvailable) {
      Alert.alert(
        'Phone Security Not Set Up',
        'Add a screen lock (PIN, pattern or password) or a fingerprint in Android settings first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openSecuritySettings },
        ]
      );
      return;
    }
    if (enabled && method === 'device') return;
    if (enabled) {
      // Switching away from a custom lock: confirm the current one first.
      navigation.navigate('AppLockSetup', { intent: 'change', method: 'device' });
      return;
    }
    if (await authenticateWithDevice()) await enableDeviceLock();
    else Alert.alert('Not Enabled', 'Phone security was cancelled or failed.');
  }

  function handlePickCustom(m: CustomLockMethod) {
    if (!enabled) navigation.navigate('AppLockSetup', { intent: 'enable', method: m });
    else if (m !== method) navigation.navigate('AppLockSetup', { intent: 'change', method: m });
  }

  function handlePreset(minutes: number) {
    setCustomOpen(false);
    setCustomError(null);
    useAppLock.setState({ timeoutMinutes: minutes });
  }

  function handleSaveCustom() {
    const err = validateCustomTimeout(customText);
    setCustomError(err);
    if (!err) useAppLock.setState({ timeoutMinutes: parseInt(customText, 10) });
  }

  const showChoice = enabled || choosing;
  const deviceSelected = enabled && method === 'device';
  const customSelected = enabled && isCustomMethod(method);

  return (
    <View style={styles.container}>
      <StackHeader title="App Lock" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Card>
          <View style={styles.row}>
            <MaterialCommunityIcons name="lock-outline" size={22} color={colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={typography.body}>App Lock</Text>
              <Text style={typography.caption}>
                {enabled && method
                  ? `On · ${METHOD_LABELS[method]} · ${describeTimeout(timeoutMinutes)}`
                  : 'Ask for authentication when opening Spend Hive'}
              </Text>
            </View>
            <Switch
              value={enabled || choosing}
              onValueChange={handleToggle}
              trackColor={{ false: colors.border, true: colors.gold }}
              thumbColor={colors.surface}
            />
          </View>
        </Card>

        {showChoice && (
          <>
            <Text style={[typography.label, { marginTop: 8 }]}>HOW TO UNLOCK</Text>

            {/* Option 1: the phone's own security. */}
            <TouchableOpacity
              style={[styles.option, deviceSelected && styles.optionActive, !deviceAvailable && { opacity: 0.6 }]}
              onPress={handlePickDevice}
              accessibilityRole="radio"
              accessibilityState={{ selected: deviceSelected }}
            >
              <MaterialCommunityIcons
                name={deviceSelected ? 'radiobox-marked' : 'radiobox-blank'}
                size={22}
                color={deviceSelected ? colors.gold : colors.textSecondary}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.optionTitle}>
                  <MaterialCommunityIcons name="fingerprint" size={20} color={colors.gold} />
                  <Text style={[typography.body, { fontWeight: '700' }]}>Phone security</Text>
                </View>
                <Text style={typography.caption}>
                  {deviceAvailable
                    ? 'Your fingerprint, face or phone screen lock'
                    : 'Not available: set up a screen lock or fingerprint on this phone first'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Option 2: a Spend Hive-only credential. */}
            <View style={[styles.option, styles.optionColumn, customSelected && styles.optionActive]}>
              <View style={styles.optionHead}>
                <MaterialCommunityIcons
                  name={customSelected ? 'radiobox-marked' : 'radiobox-blank'}
                  size={22}
                  color={customSelected ? colors.gold : colors.textSecondary}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.optionTitle}>
                    <MaterialCommunityIcons name="shield-key-outline" size={20} color={colors.gold} />
                    <Text style={[typography.body, { fontWeight: '700' }]}>Custom lock</Text>
                  </View>
                  <Text style={typography.caption}>A PIN, passcode or pattern used only for Spend Hive</Text>
                </View>
              </View>
              <View style={styles.methodRow}>
                {CUSTOM_METHODS.map((m) => {
                  const active = enabled && m.method === method;
                  return (
                    <TouchableOpacity
                      key={m.method}
                      style={[styles.methodCard, active && styles.methodCardActive]}
                      onPress={() => handlePickCustom(m.method)}
                      accessibilityState={{ selected: active }}
                    >
                      <MaterialCommunityIcons name={m.icon as any} size={24} color={active ? colors.gold : colors.textPrimary} />
                      <Text style={[typography.body, { fontWeight: '600' }, active && { color: colors.gold }]}>
                        {METHOD_LABELS[m.method]}
                      </Text>
                      <Text style={[typography.caption, { textAlign: 'center' }]}>{m.hint}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {customSelected && method && (
                <TouchableOpacity style={styles.changeRow} onPress={() => navigation.navigate('AppLockSetup', { intent: 'change' })}>
                  <MaterialCommunityIcons name="key-change" size={20} color={colors.gold} />
                  <Text style={[typography.body, { flex: 1 }]}>Change {METHOD_LABELS[method]}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {enabled && (
          <>
            <Text style={[typography.label, { marginTop: 8 }]}>WHEN TO LOCK</Text>
            <Card>
              <Text style={[typography.caption, { marginBottom: 4 }]}>
                After leaving Spend Hive, ask again {method === 'device' ? 'for phone security' : `for your ${method ? METHOD_LABELS[method] : 'lock'}`}:
              </Text>
              {TIMEOUT_PRESETS.map((p) => (
                <RadioRow
                  key={p.minutes}
                  label={p.label}
                  selected={!customOpen && timeoutMinutes === p.minutes}
                  onPress={() => handlePreset(p.minutes)}
                />
              ))}
              <RadioRow label="Custom" selected={customOpen} onPress={() => setCustomOpen(true)} />
              {customOpen && (
                <View style={styles.customWrap}>
                  <View style={styles.customRow}>
                    <TextInput
                      style={[typography.body, styles.customInput]}
                      value={customText}
                      onChangeText={(t) => {
                        setCustomText(t.replace(/[^0-9]/g, ''));
                        setCustomError(null);
                      }}
                      keyboardType="number-pad"
                      maxLength={4}
                      placeholder="Minutes"
                      placeholderTextColor={colors.textSecondary}
                      accessibilityLabel="Custom minutes"
                    />
                    <Text style={typography.caption}>minutes</Text>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveCustom}>
                      <Text style={[typography.body, { color: colors.background, fontWeight: '700' }]}>Save</Text>
                    </TouchableOpacity>
                  </View>
                  {customError ? (
                    <Text style={[typography.caption, { color: colors.expense }]}>{customError}</Text>
                  ) : isCustomTimeout ? (
                    <Text style={typography.caption}>Locks after {timeoutMinutes} minutes away.</Text>
                  ) : null}
                </View>
              )}
            </Card>
          </>
        )}

        <Text style={[typography.label, { marginTop: 8 }]}>PHONE SECURITY STATUS</Text>
        <Card>
          <StatusRow icon="cellphone-lock" label="Screen lock" ok={deviceStatus?.deviceSecure} okText="Set" badText="Not set" />
          <View style={styles.divider} />
          <StatusRow icon="fingerprint" label="Biometrics" ok={deviceStatus?.biometricEnrolled} okText="Enrolled" badText="Not enrolled" />
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={openSecuritySettings}>
            <MaterialCommunityIcons name="shield-lock-outline" size={22} color={colors.gold} />
            <Text style={[typography.body, { flex: 1 }]}>Open Android security settings</Text>
            <MaterialCommunityIcons name="open-in-new" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </Card>

        <View style={styles.note}>
          <MaterialCommunityIcons name="information-outline" size={18} color={colors.textSecondary} />
          <Text style={[typography.caption, { flex: 1 }]}>
            A custom PIN, passcode or pattern is separate from your phone's screen lock and is stored encrypted in the
            Android Keystore. App Lock needs no extra permissions and does not run in the background — it checks the
            timeout when you return to the app.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function openSecuritySettings() {
  Linking.sendIntent('android.settings.SECURITY_SETTINGS').catch(() => Linking.openSettings());
}

function RadioRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors, typography } = useTheme();
  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <MaterialCommunityIcons
        name={selected ? 'radiobox-marked' : 'radiobox-blank'}
        size={22}
        color={selected ? colors.gold : colors.textSecondary}
      />
      <Text style={[typography.body, selected && { fontWeight: '600' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatusRow({
  icon,
  label,
  ok,
  okText,
  badText,
}: {
  icon: string;
  label: string;
  ok: boolean | undefined;
  okText: string;
  badText: string;
}) {
  const { colors, typography } = useTheme();
  const color = ok == null ? colors.textSecondary : ok ? colors.income : colors.amber;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <MaterialCommunityIcons name={icon as any} size={22} color={colors.gold} />
      <Text style={[typography.body, { flex: 1 }]}>{label}</Text>
      <Text style={[typography.caption, { color, fontWeight: '700' }]}>{ok == null ? '—' : ok ? okText : badText}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    divider: { height: 1, backgroundColor: colors.separator, marginVertical: 4 },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: radius.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    optionColumn: { flexDirection: 'column', alignItems: 'stretch' },
    optionActive: { borderColor: colors.gold },
    optionHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    optionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    methodRow: { flexDirection: 'row', gap: 8 },
    methodCard: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    methodCardActive: { borderColor: colors.gold },
    changeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 },
    customWrap: { gap: 6, paddingLeft: 34, paddingBottom: 6 },
    customRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    customInput: {
      width: 90,
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    saveButton: { marginLeft: 'auto', backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 8 },
    note: { flexDirection: 'row', gap: 8, marginTop: 8, paddingHorizontal: 4 },
  });
}
