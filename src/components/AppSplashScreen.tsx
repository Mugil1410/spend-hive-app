import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { darkColors } from '@/theme/colors';

export function AppSplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/app-icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
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
  logo: {
    width: 96,
    height: 96,
  },
  title: {
    color: darkColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
