import React, { useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';

interface FormScreenProps {
  title: React.ReactNode;
  onCancel: () => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  children: React.ReactNode;
  /** Rendered between the header and the scrollable body (e.g. a type selector or tab row that should stay fixed). */
  beforeContent?: React.ReactNode;
  /** Rendered below the scrollable body, outside KeyboardAvoidingView's scroll area (e.g. a NumPad). Safe-area padded. */
  footer?: React.ReactNode;
  scrollViewProps?: Partial<ScrollViewProps>;
}

/**
 * Shared skeleton for full-screen forms: header with Cancel/Save (kept in-flow, never
 * absolutely positioned so it can't end up under the status bar or nav bar), a
 * KeyboardAvoidingView-wrapped scrollable body so fields/buttons stay reachable when the
 * keyboard opens, and safe-area-aware bottom padding so content never sits under the
 * Android navigation bar.
 */
export function FormScreen({
  title,
  onCancel,
  onSave,
  saveDisabled,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  children,
  beforeContent,
  footer,
  scrollViewProps,
}: FormScreenProps) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.cancel}>{cancelLabel}</Text>
        </TouchableOpacity>
        <Text style={typography.h2} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        {onSave ? (
          <TouchableOpacity onPress={onSave} disabled={saveDisabled}>
            <Text style={[styles.save, saveDisabled && { opacity: 0.4 }]}>{saveLabel}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {beforeContent}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          {...scrollViewProps}
          style={[styles.flex, scrollViewProps?.style]}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: (footer ? 12 : insets.bottom + 24) },
            scrollViewProps?.contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
        {footer ? <View style={{ paddingBottom: insets.bottom || 12 }}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    headerSpacer: { width: 40 },
    cancel: { color: colors.textSecondary, fontSize: 14 },
    save: { color: colors.gold, fontSize: 14, fontWeight: '700' },
    content: { paddingHorizontal: 16, paddingTop: 16 },
  });
}
