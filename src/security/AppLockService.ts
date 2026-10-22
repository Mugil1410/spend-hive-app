import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { randomBytes } from '@noble/ciphers/utils.js';
import { SecureStore } from '@/native/SecureStore';
import { bytesToBase64, base64ToBytes } from '@/utils/base64';
import { stringToUtf8Bytes } from '@/utils/utf8';
import { AppState } from 'react-native';
import { useAppLock, LockMethod, CustomLockMethod } from './appLockStore';

const CREDENTIAL_KEY = 'appLockCredential';
const ITERATIONS = 10_000;

// After this many wrong attempts, each further one locks input for an increasing period.
const FREE_ATTEMPTS = 5;
const BASE_LOCKOUT_MS = 30_000;
const MAX_LOCKOUT_MS = 15 * 60_000;

export const PIN_MIN = 4;
export const PIN_MAX = 6;
export const PASSCODE_MIN = 4;
export const PATTERN_MIN_DOTS = 4;
export const CUSTOM_TIMEOUT_MAX = 24 * 60;

export const TIMEOUT_PRESETS: { minutes: number; label: string }[] = [
  { minutes: 0, label: 'Immediately' },
  { minutes: 15, label: 'After 15 minutes' },
  { minutes: 30, label: 'After 30 minutes' },
  { minutes: 60, label: 'After 1 hour' },
];

export const METHOD_LABELS: Record<LockMethod, string> = {
  device: 'Phone security',
  pin: 'PIN',
  passcode: 'Passcode',
  pattern: 'Pattern',
};

export function isCustomMethod(method: LockMethod | null): method is CustomLockMethod {
  return method === 'pin' || method === 'passcode' || method === 'pattern';
}

interface StoredCredential {
  method: CustomLockMethod;
  saltB64: string;
  hashB64: string;
  iterations: number;
}

async function hashSecret(secret: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  return pbkdf2Async(sha256, stringToUtf8Bytes(secret), salt, { c: iterations, dkLen: 32 });
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function describeTimeout(minutes: number): string {
  const preset = TIMEOUT_PRESETS.find((p) => p.minutes === minutes);
  if (preset) return preset.label;
  return minutes % 60 === 0 ? `After ${minutes / 60} hours` : `After ${minutes} minutes`;
}

/** Validates the custom-timeout field; returns an error message or null. */
export function validateCustomTimeout(text: string): string | null {
  if (!/^\d+$/.test(text.trim())) return 'Enter a whole number of minutes.';
  const n = parseInt(text, 10);
  if (n < 1) return 'Must be at least 1 minute.';
  if (n > CUSTOM_TIMEOUT_MAX) return `Must be at most ${CUSTOM_TIMEOUT_MAX} minutes (24 hours).`;
  return null;
}

/** Validates a new secret for the method; returns an error message or null. */
export function validateSecret(method: CustomLockMethod, secret: string): string | null {
  switch (method) {
    case 'pin':
      if (!/^\d+$/.test(secret)) return 'PIN must contain digits only.';
      if (secret.length < PIN_MIN || secret.length > PIN_MAX) return `PIN must be ${PIN_MIN}–${PIN_MAX} digits.`;
      return null;
    case 'passcode':
      if (secret.length < PASSCODE_MIN) return `Passcode must be at least ${PASSCODE_MIN} characters.`;
      if (/\s/.test(secret)) return 'Passcode cannot contain spaces.';
      return null;
    case 'pattern':
      if (secret.split('-').length < PATTERN_MIN_DOTS) return `Connect at least ${PATTERN_MIN_DOTS} dots.`;
      return null;
  }
}

/** Saves a new custom credential and turns App Lock on with it. */
export async function setCredential(method: CustomLockMethod, secret: string) {
  const salt = randomBytes(16);
  const hash = await hashSecret(secret, salt, ITERATIONS);
  const stored: StoredCredential = {
    method,
    saltB64: bytesToBase64(salt),
    hashB64: bytesToBase64(hash),
    iterations: ITERATIONS,
  };
  await SecureStore.setItem(CREDENTIAL_KEY, JSON.stringify(stored));
  useAppLock.setState({
    enabled: true,
    method,
    pinLength: method === 'pin' ? secret.length : useAppLock.getState().pinLength,
    failedAttempts: 0,
    lockoutUntil: 0,
    locked: false,
  });
}

export type VerifyResult = { ok: true } | { ok: false; lockoutUntil: number; attemptsLeft: number };

/** Checks a secret against the stored credential, applying the wrong-attempt lockout. */
export async function verifySecret(secret: string): Promise<VerifyResult> {
  const { lockoutUntil, failedAttempts } = useAppLock.getState();
  if (lockoutUntil > Date.now()) return { ok: false, lockoutUntil, attemptsLeft: 0 };

  const raw = await SecureStore.getItem(CREDENTIAL_KEY);
  if (raw) {
    const stored: StoredCredential = JSON.parse(raw);
    const hash = await hashSecret(secret, base64ToBytes(stored.saltB64), stored.iterations);
    if (constantTimeEqual(hash, base64ToBytes(stored.hashB64))) {
      useAppLock.setState({ failedAttempts: 0, lockoutUntil: 0 });
      return { ok: true };
    }
  }

  const attempts = failedAttempts + 1;
  const over = attempts - FREE_ATTEMPTS;
  const until = over >= 0 ? Date.now() + Math.min(BASE_LOCKOUT_MS * 2 ** over, MAX_LOCKOUT_MS) : 0;
  useAppLock.setState({ failedAttempts: attempts, lockoutUntil: until });
  return { ok: false, lockoutUntil: until, attemptsLeft: Math.max(FREE_ATTEMPTS - attempts, 0) };
}

/** Turns App Lock on using the phone's own biometrics / screen lock (any custom credential is wiped). */
export async function enableDeviceLock() {
  await SecureStore.deleteItem(CREDENTIAL_KEY);
  useAppLock.setState({ enabled: true, method: 'device', failedAttempts: 0, lockoutUntil: 0, locked: false });
}

/** Turns App Lock off and wipes the stored credential. */
export async function disableAppLock() {
  await SecureStore.deleteItem(CREDENTIAL_KEY);
  useAppLock.setState({
    enabled: false,
    method: null,
    failedAttempts: 0,
    lockoutUntil: 0,
    locked: false,
  });
}

// True from showing the system biometric / screen-lock prompt until the app is back in the
// foreground afterwards: the prompt (especially the screen-lock fallback) pauses our activity,
// and that background/foreground round-trip must not count as leaving the app.
let systemPromptActive = false;
let promptSettled = false;

export function isSystemPromptActive() {
  return systemPromptActive;
}

AppState.addEventListener('change', (next) => {
  // The first return to the foreground after the prompt finished ends the ignore window.
  if (next === 'active' && promptSettled) {
    systemPromptActive = false;
    promptSettled = false;
  }
});

/** Shows the system biometric / screen-lock prompt. Resolves true when the user passes it. */
export async function authenticateWithDevice(): Promise<boolean> {
  if (systemPromptActive && !promptSettled) return false; // one prompt at a time
  systemPromptActive = true;
  promptSettled = false;
  try {
    return await SecureStore.authenticate('Unlock Spend Hive', 'Use your fingerprint, face or screen lock');
  } catch {
    return false;
  } finally {
    promptSettled = true;
    // Some prompts never pause the activity; then there is no 'active' event to wait for.
    if (AppState.currentState === 'active') {
      setTimeout(() => {
        if (promptSettled && AppState.currentState === 'active') {
          systemPromptActive = false;
          promptSettled = false;
        }
      }, 1500);
    }
  }
}

export function unlock() {
  useAppLock.setState({ locked: false, failedAttempts: 0, lockoutUntil: 0, backgroundedAt: null });
}
