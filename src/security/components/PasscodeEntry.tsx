import React, { useEffect, useMemo, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { MaterialDesignIcons as MaterialCommunityIcons } from '@react-native-vector-icons/material-design-icons/static';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';
import { PASSCODE_MIN } from '../AppLockService';

interface Props {
  disabled?: boolean;
  onSubmit: (passcode: string) => void;
  resetKey?: number;
  submitLabel?: string;
}

export function PasscodeEntry({ disabled, onSubmit, resetKey, submitLabel = 'Continue' }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [value, setValue] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => setValue(''), [resetKey]);

  const canSubmit = !disabled && value.length >= PASSCODE_MIN;

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <TextInput
          style={[typography.body, styles.input]}
          value={value}
          onChangeText={setValue}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          editable={!disabled}
          placeholder="Passcode"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="done"
          onSubmitEditing={() => canSubmit && onSubmit(value)}
          accessibilityLabel="Passcode"
        />
        <TouchableOpacity onPress={() => setVisible((v) => !v)} hitSlop={10} accessibilityLabel="Show passcode">
          <MaterialCommunityIcons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.button, !canSubmit && { opacity: 0.5 }]}
        disabled={!canSubmit}
        onPress={() => onSubmit(value)}
      >
        <Text style={[typography.body, { color: colors.background, fontWeight: '700' }]}>{submitLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrap: { width: '100%', maxWidth: 360, gap: 16 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.inputBackground,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
    },
    input: { flex: 1, paddingVertical: 12, fontSize: 16 },
    button: {
      backgroundColor: colors.gold,
      borderRadius: radius.pill,
      paddingVertical: 14,
      alignItems: 'center',
    },
  });
}
