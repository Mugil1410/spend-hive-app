import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialDesignIcons as MaterialCommunityIcons } from '@react-native-vector-icons/material-design-icons/static';
import { useTheme } from '@/theme/ThemeContext';
import { PIN_MAX, PIN_MIN } from '../AppLockService';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0', 'OK'];

interface Props {
  /** Submit automatically once this many digits are typed (verify mode). */
  autoSubmitLength?: number;
  disabled?: boolean;
  onSubmit: (pin: string) => void;
  /** Changing this clears the typed digits (e.g. after a wrong attempt or a completed step). */
  resetKey?: number;
}

export function PinEntry({ autoSubmitLength, disabled, onSubmit, resetKey }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pin, setPin] = useState('');

  useEffect(() => setPin(''), [resetKey]);

  function press(key: string) {
    if (disabled) return;
    if (key === 'DEL') return setPin((p) => p.slice(0, -1));
    if (key === 'OK') {
      if (pin.length >= PIN_MIN) onSubmit(pin);
      return;
    }
    if (pin.length >= PIN_MAX) return;
    const next = pin + key;
    setPin(next);
    if (autoSubmitLength && next.length === autoSubmitLength) onSubmit(next);
  }

  const slots = autoSubmitLength ?? Math.max(PIN_MIN, Math.min(pin.length + 1, PIN_MAX));

  return (
    <View style={styles.wrap}>
      <View style={styles.dots} accessibilityLabel={`${pin.length} digits entered`}>
        {Array.from({ length: slots }).map((_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
        ))}
      </View>
      <View style={styles.grid}>
        {KEYS.map((key) => {
          const hidden = key === 'OK' && !!autoSubmitLength;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.key, hidden && { opacity: 0 }]}
              disabled={hidden || disabled}
              onPress={() => press(key)}
              accessibilityLabel={key === 'DEL' ? 'Delete' : key === 'OK' ? 'Confirm' : key}
            >
              {key === 'DEL' ? (
                <MaterialCommunityIcons name="backspace-outline" size={24} color={colors.textPrimary} />
              ) : key === 'OK' ? (
                <MaterialCommunityIcons
                  name="check"
                  size={26}
                  color={pin.length >= PIN_MIN ? colors.gold : colors.textSecondary}
                />
              ) : (
                <Text style={[typography.h1, { fontWeight: '500' }]}>{key}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', gap: 28 },
    dots: { flexDirection: 'row', gap: 16, height: 16 },
    dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.textSecondary },
    dotFilled: { backgroundColor: colors.gold, borderColor: colors.gold },
    grid: { flexDirection: 'row', flexWrap: 'wrap', width: 264, gap: 12, justifyContent: 'center' },
    key: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}
