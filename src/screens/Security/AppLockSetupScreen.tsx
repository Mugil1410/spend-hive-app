import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@/theme/ThemeContext';
import { FormScreen } from '@/components/FormScreen';
import { RootStackParamList } from '@/navigation/types';
import { useAppLock } from '@/security/appLockStore';
import { SecretEntry } from '@/security/components/SecretEntry';
import { disableAppLock, METHOD_LABELS, setCredential, validateSecret, verifySecret } from '@/security/AppLockService';

type Step = 'verify' | 'create' | 'confirm';

/**
 * Creates, changes or removes the App Lock credential. Changing or disabling first asks for the
 * current credential, so an unlocked phone left on the table can't be used to turn the lock off.
 */
export function AppLockSetupScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'AppLockSetup'>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const current = useAppLock((s) => s.method);
  const pinLength = useAppLock((s) => s.pinLength);
  const lockoutUntil = useAppLock((s) => s.lockoutUntil);
  const newMethod = params.method ?? current ?? 'pin';

  const [step, setStep] = useState<Step>(params.intent === 'enable' ? 'create' : 'verify');
  const [first, setFirst] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const activeMethod = step === 'verify' ? current ?? newMethod : newMethod;
  const label = METHOD_LABELS[activeMethod];

  function fail(text: string) {
    setMessage(text);
    setError(true);
    setTimeout(() => {
      setError(false);
      setResetKey((k) => k + 1);
    }, 700);
  }

  function nextStep(s: Step) {
    setStep(s);
    setMessage(null);
    setResetKey((k) => k + 1);
  }

  async function handleSubmit(secret: string) {
    if (busy) return;
    if (step === 'verify') {
      setBusy(true);
      try {
        const result = await verifySecret(secret);
        if (!result.ok) {
          const waitSec = Math.ceil((result.lockoutUntil - Date.now()) / 1000);
          return fail(waitSec > 0 ? `Too many wrong attempts. Try again in ${waitSec}s.` : `Wrong ${label.toLowerCase()}.`);
        }
        if (params.intent === 'disable') {
          await disableAppLock();
          navigation.goBack();
          return;
        }
        nextStep('create');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (step === 'create') {
      const invalid = validateSecret(newMethod, secret);
      if (invalid) return fail(invalid);
      setFirst(secret);
      nextStep('confirm');
      return;
    }

    if (secret !== first) {
      setFirst('');
      setStep('create');
      return fail(`${label}s didn't match. Start again.`);
    }
    setBusy(true);
    try {
      await setCredential(newMethod, secret);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could Not Save', e instanceof Error ? e.message : 'Secure storage is unavailable.');
    } finally {
      setBusy(false);
    }
  }

  const title = params.intent === 'disable' ? 'Turn Off App Lock' : params.intent === 'change' ? `Change ${label}` : `Set ${label}`;
  const prompt =
    step === 'verify'
      ? `Enter your current ${METHOD_LABELS[current ?? newMethod].toLowerCase()}`
      : step === 'create'
        ? newMethod === 'pattern'
          ? 'Draw an unlock pattern'
          : newMethod === 'pin'
            ? 'Choose a 4–6 digit PIN, then tap ✓'
            : 'Choose a passcode (at least 4 characters)'
        : `Confirm your ${label.toLowerCase()}`;

  return (
    <FormScreen title={title} onCancel={() => navigation.goBack()} scrollViewProps={{ scrollEnabled: false }}>
      <View style={styles.body}>
        <Text style={[typography.h2, { textAlign: 'center' }]}>{prompt}</Text>
        <Text style={[typography.caption, styles.message, error && { color: colors.expense }]}>
          {message ?? (step === 'verify' ? ' ' : `This ${label.toLowerCase()} only unlocks Spend Hive. It is separate from your phone's screen lock.`)}
        </Text>
        <SecretEntry
          key={step}
          method={activeMethod}
          onSubmit={handleSubmit}
          disabled={busy || (step === 'verify' && lockoutUntil > Date.now())}
          error={error}
          resetKey={resetKey}
          pinAutoSubmitLength={step === 'verify' ? pinLength : step === 'confirm' ? first.length : undefined}
          submitLabel={step === 'verify' ? 'Continue' : step === 'create' ? 'Next' : 'Confirm'}
        />
        {busy && <ActivityIndicator color={colors.gold} />}
      </View>
    </FormScreen>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    body: { alignItems: 'center', gap: 20, paddingTop: 24 },
    message: { textAlign: 'center', minHeight: 32, paddingHorizontal: 12, color: colors.textSecondary },
  });
}
