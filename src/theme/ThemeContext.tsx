import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName, TextStyle } from 'react-native';
import { darkColors, lightColors, ColorPalette } from './colors';
import { createTypography } from './typography';
import { useStore } from '@/store/useStore';

interface ThemeContextValue {
  colors: ColorPalette;
  typography: Record<string, TextStyle>;
  scheme: 'light' | 'dark';
}

const defaultValue: ThemeContextValue = {
  colors: darkColors,
  typography: createTypography(darkColors),
  scheme: 'dark',
};

const ThemeContext = createContext<ThemeContextValue>(defaultValue);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = useStore((s) => s.themeMode);
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName | null | undefined>(
    Appearance.getColorScheme()
  );

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystemScheme(colorScheme));
    return () => sub.remove();
  }, []);

  const scheme: 'light' | 'dark' = themeMode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : themeMode;

  const value = useMemo<ThemeContextValue>(() => {
    const colors = scheme === 'light' ? lightColors : darkColors;
    return { colors, typography: createTypography(colors), scheme };
  }, [scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
