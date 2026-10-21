import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState, BackHandler, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialDesignIcons as MaterialCommunityIcons } from '@react-native-vector-icons/material-design-icons/static';
import { useTheme } from '@/theme/ThemeContext';
import { Logo } from '@/components/Logo';
import { useAppLock } from './appLockStore';
import { authenticateWithDevice, METHOD_LABELS, unlock, verifySecret } from './AppLockService';
import { SecretEntry } from './components/SecretEntry';

/** Full-screen overlay shown above the navigator while the app is locked. */
export function LockScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const method = useAppLock((s) => s.method);
  const useDeviceAuth = useAppLock((s) => s.useDeviceAuth);
  const pinLength = useAppLock((s) => s.pinLength);
  const lockoutUntil = useAppLock((s) => s.lockoutUntil);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [now, setNow] = useState(Date.now());
  const promptedRef = useRef(false);

  const lockedOut = lockoutUntil > now;

  // Countdown while input is locked out after too many wrong attempts.
  useEffect(() => {
    if (!lockedOut) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [lockedOut]);

  // Back must not reveal the app underneath.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const tryDeviceAuth = useCallback(async () => {
    if (await authenticateWithDevice()) unlock();
  }, []);

  // Offer the system prompt once per lock, as soon as the app is in the foreground.
  useEffect(() => {
    if (!useDeviceAuth) return;
    const maybePrompt = () => {
      if (promptedRef.current || AppState.currentState !== 'active') return;
      promptedRef.current = true;
      tryDeviceAuth();
    };
    maybePrompt();
    const sub = AppState.addEventListener('change', maybePrompt);
    return () => sub.remove();
  }, [useDeviceAuth, tryDeviceAuth]);

  async function handleSubmit(secret: string) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await verifySecret(secret);
      if (result.ok) {
        unlock();
        return;
      }
      setError(true);
      setNow(Date.now());
      setMessage(
        result.lockoutUntil > Date.now()
          ? 'Too many wrong attempts.'
          : `Wrong ${method ? METHOD_LABELS[method].toLowerCase() : 'entry'}. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? '' : 's'} left before a timeout.`
      );
      setTimeout(() => {
        setError(false);
        setResetKey((k) => k + 1);
      }, 700);
    } catch {
      setMessage('Could not check your credential. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!method) return null;

  const secondsLeft = Math.ceil((lockoutUntil - now) / 1000);

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior="padding" style={styles.content}>
          <View style={styles.head}>
            <Logo size={64} color={colors.gold} letterColor={colors.background} />
            <Text style={[typography.h1, { marginTop: 12 }]}>Spend Hive is locked</Text>
            <Text style={[typography.caption, { textAlign: 'center' }]}>
              {method === 'pattern' ? 'Draw your pattern' : `Enter your ${METHOD_LABELS[method]}`} to continue
            </Text>
            <Text style={[typography.caption, styles.message, { color: colors.expense }]} accessibilityLiveRegion="polite">
              {lockedOut ? `Try again in ${secondsLeft}s` : message ?? ' '}
            </Text>
          </View>

          <SecretEntry
            method={method}
            onSubmit={handleSubmit}
            disabled={busy || lockedOut}
            error={error}
            resetKey={resetKey}
            pinAutoSubmitLength={pinLength}
            submitLabel="Unlock"
          />

          {useDeviceAuth && (
            <TouchableOpacity style={styles.deviceButton} onPress={tryDeviceAuth}>
              <MaterialCommunityIcons name="fingerprint" size={22} color={colors.gold} />
              <Text style={[typography.body, { color: colors.gold, fontWeight: '600' }]}>Use device unlock</Text>
            </TouchableOpacity>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    overlay: { backgroundColor: colors.background, zIndex: 100, elevation: 100 },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 24 },
    head: { alignItems: 'center', gap: 6 },
    message: { minHeight: 18, textAlign: 'center', marginTop: 4 },
    deviceButton: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  });
}
