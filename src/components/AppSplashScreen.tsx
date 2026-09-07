import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Logo } from './Logo';
import { darkColors } from '@/theme/colors';

export function AppSplashScreen() {
  return (
    <View style={styles.container}>
      <Logo size={72} color={darkColors.gold} letterColor={darkColors.background} />
      <Text style={styles.title}>SpendHive</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkColors.background,
    gap: 12,
  },
  title: {
    color: darkColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
