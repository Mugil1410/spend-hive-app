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
import { LockMethod, useAppLock } from '@/security/appLockStore';
import {
  authenticateWithDevice,
  METHOD_LABELS,
  TIMEOUT_PRESETS,
  validateCustomTimeout,
} from '@/security/AppLockService';
import { DeviceAuthStatus, SecureStore } from '@/native/SecureStore';

const METHODS: { method: LockMethod; icon: string; hint: string }[] = [
  { method: 'pin', icon: 'dialpad', hint: '4–6 digits' },
  { method: 'passcode', icon: 'form-textbox-password', hint: 'Letters & numbers' },
  { method: 'pattern', icon: 'gesture', hint: 'Connect 4+ dots' },
];

export function AppLockSettingsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { enabled, method, timeoutMinutes, useDeviceAuth } = useAppLock();

  const [choosing, setChoosing] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<DeviceAuthStatus | null>(null);
  const isCustom = !TIMEOUT_PRESETS.some((p) => p.minutes === timeoutMinutes);
  const [customOpen, setCustomOpen] = useState(isCustom);
  const [customText, setCustomText] = useState(isCustom ? String(timeoutMinutes) : '');
  const [customError, setCustomError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setChoosing(false);
      SecureStore.getDeviceAuthStatus().then(setDeviceStatus).catch(() => setDeviceStatus(null));
    }, [])
  );

  function handleToggle(value: boolean) {
    if (value) setChoosing(true);
    else if (enabled) navigation.navigate('AppLockSetup', { intent: 'disable' });
    else setChoosing(false);
  }

  function handlePickMethod(m: LockMethod) {
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

  async function handleDeviceAuthToggle(value: boolean) {
    if (!value) {
      useAppLock.setState({ useDeviceAuth: false });
      return;
    }
    // Confirm the prompt actually works before relying on it.
    if (await authenticateWithDevice()) useAppLock.setState({ useDeviceAuth: true });
    else Alert.alert('Not Enabled', 'Device authentication was cancelled or failed.');
  }

  function openSecuritySettings() {
    Linking.sendIntent('android.settings.SECURITY_SETTINGS').catch(() => Linking.openSettings());
  }

  const showMethods = enabled || choosing;
  const deviceAvailable = !!deviceStatus?.available;

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
                {enabled && method ? `On · ${METHOD_LABELS[method]}` : 'Require a PIN, passcode or pattern to open Spend Hive'}
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

        {showMethods && (
          <>
            <Text style={[typography.label, { marginTop: 8 }]}>{enabled ? 'LOCK METHOD' : 'CHOOSE A LOCK METHOD'}</Text>
            <View style={styles.methodRow}>
              {METHODS.map((m) => {
                const active = enabled && m.method === method;
                return (
                  <TouchableOpacity
                    key={m.method}
                    style={[styles.methodCard, active && styles.methodCardActive]}
                    onPress={() => handlePickMethod(m.method)}
                    accessibilityState={{ selected: active }}
                  >
                    <MaterialCommunityIcons name={m.icon as any} size={26} color={active ? colors.gold : colors.textPrimary} />
                    <Text style={[typography.body, { fontWeight: '600' }, active && { color: colors.gold }]}>
                      {METHOD_LABELS[m.method]}
                    </Text>
                    <Text style={[typography.caption, { textAlign: 'center' }]}>{m.hint}</Text>
                    {active && <MaterialCommunityIcons name="check-circle" size={18} color={colors.gold} style={styles.check} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            {enabled && method && (
              <Card>
                <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('AppLockSetup', { intent: 'change' })}>
                  <MaterialCommunityIcons name="key-change" size={22} color={colors.gold} />
                  <Text style={[typography.body, { flex: 1 }]}>Change {METHOD_LABELS[method]}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </Card>
            )}
          </>
        )}

        {enabled && (
          <>
            <Text style={[typography.label, { marginTop: 8 }]}>LOCK WHEN APP IS CLOSED OR IN BACKGROUND</Text>
            <Card>
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
                  ) : isCustom ? (
                    <Text style={typography.caption}>Locks after {timeoutMinutes} minutes away.</Text>
                  ) : null}
                </View>
              )}
            </Card>

            <Text style={[typography.label, { marginTop: 8 }]}>DEVICE UNLOCK</Text>
            <Card style={!deviceAvailable && styles.disabledCard}>
              <View style={styles.row}>
                <MaterialCommunityIcons name="fingerprint" size={22} color={colors.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={typography.body}>Use Device Authentication</Text>
                  <Text style={typography.caption}>
                    {deviceAvailable
                      ? 'Unlock with your fingerprint, face or phone screen lock as well'
                      : 'Set up a screen lock or fingerprint in Android settings to use this'}
                  </Text>
                </View>
                <Switch
                  value={useDeviceAuth && deviceAvailable}
                  onValueChange={handleDeviceAuthToggle}
                  disabled={!deviceAvailable}
                  trackColor={{ false: colors.border, true: colors.gold }}
                  thumbColor={colors.surface}
                />
              </View>
            </Card>
          </>
        )}

        <Text style={[typography.label, { marginTop: 8 }]}>PHONE SECURITY</Text>
        <Card>
          <StatusRow
            icon="cellphone-lock"
            label="Screen lock"
            ok={deviceStatus?.deviceSecure}
            okText="Set"
            badText="Not set"
          />
          <View style={styles.divider} />
          <StatusRow
            icon="fingerprint"
            label="Biometrics"
            ok={deviceStatus?.biometricEnrolled}
            okText="Enrolled"
            badText="Not enrolled"
          />
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
            Your Spend Hive PIN, passcode or pattern is separate from your phone's screen lock and is stored encrypted
            in the Android Keystore. App Lock needs no extra permissions and does not run in the background — it
            checks the timeout when you return to the app.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
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
    disabledCard: { opacity: 0.6 },
    methodRow: { flexDirection: 'row', gap: 10 },
    methodCard: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      paddingVertical: 16,
      paddingHorizontal: 6,
      borderRadius: radius.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    methodCardActive: { borderColor: colors.gold },
    check: { position: 'absolute', top: 6, right: 6 },
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
