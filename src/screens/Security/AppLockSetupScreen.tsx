import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialDesignIcons as MaterialCommunityIcons } from '@react-native-vector-icons/material-design-icons/static';
import { useTheme } from '@/theme/ThemeContext';
import { FormScreen } from '@/components/FormScreen';
import { RootStackParamList } from '@/navigation/types';
import { CustomLockMethod, useAppLock } from '@/security/appLockStore';
import { SecretEntry } from '@/security/components/SecretEntry';
import {
  authenticateWithDevice,
  disableAppLock,
  enableDeviceLock,
  isCustomMethod,
  METHOD_LABELS,
  setCredential,
  validateSecret,
  verifySecret,
} from '@/security/AppLockService';

type Step = 'verify' | 'create' | 'confirm';

/**
 * Creates, changes or removes the App Lock. Changing or disabling first asks for the current
 * lock (custom credential or phone security), so an unlocked phone left on the table can't be
 * used to turn it off.
 */
export function AppLockSetupScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'AppLockSetup'>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const current = useAppLock((s) => s.method);
  const pinLength = useAppLock((s) => s.pinLength);
  const lockoutUntil = useAppLock((s) => s.lockoutUntil);
  const target = params.method ?? current ?? 'pin';

  const [step, setStep] = useState<Step>(params.intent === 'enable' ? 'create' : 'verify');
  const [first, setFirst] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  function fail(text: string) {
    setMessage(text);
    setError(true);
    setTimeout(() => {
      setError(false);
      setResetKey((k) => k + 1);
    }, 700);
  }

  /** After the current lock is verified (or nothing needed verifying). */
  const afterVerified = useCallback(async () => {
    if (params.intent === 'disable') {
      await disableAppLock();
      navigation.goBack();
      return;
    }
    if (target === 'device') {
      // Confirm the phone prompt works before switching to it.
      if (await authenticateWithDevice()) {
        await enableDeviceLock();
        navigation.goBack();
      } else {
        setMessage('Phone security was cancelled or failed. Your current lock is unchanged.');
      }
      return;
    }
    setStep('create');
    setMessage(null);
    setResetKey((k) => k + 1);
  }, [params.intent, target, navigation]);

  const verifyWithDevice = useCallback(async () => {
    setBusy(true);
    try {
      if (await authenticateWithDevice()) await afterVerified();
      else setMessage('Not verified. Tap below to try again.');
    } finally {
      setBusy(false);
    }
  }, [afterVerified]);

  // The current lock is phone security: show its prompt straight away.
  useEffect(() => {
    if (step === 'verify' && current === 'device') verifyWithDevice();
    // Only on arrival, not whenever the callback identity changes.
  }, []);

  async function handleSubmit(secret: string) {
    if (busy) return;
    if (step === 'verify') {
      setBusy(true);
      try {
        const result = await verifySecret(secret);
        if (!result.ok) {
          const waitSec = Math.ceil((result.lockoutUntil - Date.now()) / 1000);
          const label = current ? METHOD_LABELS[current].toLowerCase() : 'entry';
          return fail(waitSec > 0 ? `Too many wrong attempts. Try again in ${waitSec}s.` : `Wrong ${label}.`);
        }
        await afterVerified();
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!isCustomMethod(target)) return;
    if (step === 'create') {
      const invalid = validateSecret(target, secret);
      if (invalid) return fail(invalid);
      setFirst(secret);
      setStep('confirm');
      setMessage(null);
      setResetKey((k) => k + 1);
      return;
    }

    if (secret !== first) {
      setFirst('');
      setStep('create');
      return fail(`${METHOD_LABELS[target]}s didn't match. Start again.`);
    }
    setBusy(true);
    try {
      await setCredential(target, secret);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could Not Save', e instanceof Error ? e.message : 'Secure storage is unavailable.');
    } finally {
      setBusy(false);
    }
  }

  const title =
    params.intent === 'disable'
      ? 'Turn Off App Lock'
      : target === 'device'
        ? 'Use Phone Security'
        : `${params.intent === 'change' && target === current ? 'Change' : 'Set'} ${METHOD_LABELS[target]}`;

  // Which input is on screen: the current lock while verifying, the new custom one afterwards.
  const entryMethod: CustomLockMethod | null =
    step === 'verify' ? (isCustomMethod(current) ? current : null) : isCustomMethod(target) ? target : null;

  const prompt =
    step === 'verify'
      ? current === 'device'
        ? 'Confirm it’s you with your phone security'
        : `Enter your current ${current ? METHOD_LABELS[current].toLowerCase() : 'lock'}`
      : step === 'create'
        ? target === 'pattern'
          ? 'Draw an unlock pattern'
          : target === 'pin'
            ? 'Choose a 4–6 digit PIN, then tap ✓'
            : 'Choose a passcode (at least 4 characters)'
        : `Confirm your ${METHOD_LABELS[target].toLowerCase()}`;

  return (
    <FormScreen title={title} onCancel={() => navigation.goBack()} scrollViewProps={{ scrollEnabled: false }}>
      <View style={styles.body}>
        <Text style={[typography.h2, { textAlign: 'center' }]}>{prompt}</Text>
        <Text style={[typography.caption, styles.message, error && { color: colors.expense }]}>
          {message ??
            (step === 'verify'
              ? ' '
              : `This ${METHOD_LABELS[target].toLowerCase()} only unlocks Spend Hive. It is separate from your phone's screen lock.`)}
        </Text>
        {entryMethod ? (
          <SecretEntry
            key={step}
            method={entryMethod}
            onSubmit={handleSubmit}
            disabled={busy || (step === 'verify' && lockoutUntil > Date.now())}
            error={error}
            resetKey={resetKey}
            pinAutoSubmitLength={step === 'verify' ? pinLength : step === 'confirm' ? first.length : undefined}
            submitLabel={step === 'verify' ? 'Continue' : step === 'create' ? 'Next' : 'Confirm'}
          />
        ) : (
          <TouchableOpacity style={styles.deviceButton} onPress={verifyWithDevice} disabled={busy}>
            <MaterialCommunityIcons name="fingerprint" size={26} color={colors.background} />
            <Text style={[typography.body, { color: colors.background, fontWeight: '700' }]}>Verify</Text>
          </TouchableOpacity>
        )}
        {busy && <ActivityIndicator color={colors.gold} />}
      </View>
    </FormScreen>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    body: { alignItems: 'center', gap: 20, paddingTop: 24 },
    message: { textAlign: 'center', minHeight: 32, paddingHorizontal: 12, color: colors.textSecondary },
    deviceButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.gold,
      borderRadius: 999,
      paddingVertical: 14,
      paddingHorizontal: 32,
    },
  });
}
