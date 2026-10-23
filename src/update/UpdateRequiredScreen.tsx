import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialDesignIcons as MaterialCommunityIcons } from '@react-native-vector-icons/material-design-icons/static';
import DeviceInfo from 'react-native-device-info';
import { useTheme } from '@/theme/ThemeContext';
import { Logo } from '@/components/Logo';
import { openUpdateUrl, RequiredUpdate } from './updateCheck';

/**
 * Full-screen overlay above everything (including the lock screen) while a forced update is
 * pending. Unlike an Alert it can't be dismissed, and it is still there when the user comes back
 * from the browser or reopens the app from recent apps.
 */
export function UpdateRequiredScreen({ update }: { update: RequiredUpdate }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Back closes the app rather than revealing it underneath.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaView style={[StyleSheet.absoluteFill, styles.overlay]}>
      <View style={styles.content}>
        <Logo size={72} color={colors.gold} letterColor={colors.background} />
        <View style={styles.head}>
          <Text style={typography.h1}>Update required</Text>
          <Text style={[typography.caption, styles.center]}>
            Version {update.version} is required to continue using Spend Hive. You have version{' '}
            {DeviceInfo.getVersion()}.
          </Text>
          <Text style={[typography.caption, styles.center]}>
            Your data stays on this phone and is kept when you install the update.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={() => openUpdateUrl(update.updateUrl)}
          disabled={!update.updateUrl}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="download" size={20} color={colors.background} />
          <Text style={[styles.buttonText, { color: colors.background }]}>Update now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    overlay: { backgroundColor: colors.background, zIndex: 300, elevation: 300 },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 24 },
    head: { alignItems: 'center', gap: 8 },
    center: { textAlign: 'center' },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.gold,
      borderRadius: 999,
      paddingVertical: 14,
      paddingHorizontal: 32,
    },
    buttonText: { fontSize: 15, fontWeight: '700' },
  });
}
