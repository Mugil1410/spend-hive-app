import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName, TextStyle } from 'react-native';
import { darkColors, ColorPalette } from './colors';
import { getTheme } from './themes';
import { createTypography } from './typography';
import { useStore } from '@/store/useStore';

interface ThemeContextValue {
  colors: ColorPalette;
  typography: Record<string, TextStyle>;
  scheme: 'light' | 'dark';
  themeId: string;
}

const defaultValue: ThemeContextValue = {
  colors: darkColors,
  typography: createTypography(darkColors),
  scheme: 'dark',
  themeId: 'charcoal',
};

const ThemeContext = createContext<ThemeContextValue>(defaultValue);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = useStore((s) => s.themeMode);
  const darkThemeId = useStore((s) => s.darkThemeId);
  const lightThemeId = useStore((s) => s.lightThemeId);
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName | null | undefined>(
    Appearance.getColorScheme()
  );

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystemScheme(colorScheme));
    return () => sub.remove();
  }, []);

  const scheme: 'light' | 'dark' = themeMode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : themeMode;

  const value = useMemo<ThemeContextValue>(() => {
    const theme = getTheme(scheme === 'light' ? lightThemeId : darkThemeId, scheme);
    return { colors: theme.colors, typography: createTypography(theme.colors), scheme, themeId: theme.id };
  }, [scheme, darkThemeId, lightThemeId]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
