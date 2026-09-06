import { TextStyle } from 'react-native';
import { ColorPalette } from './colors';

export function createTypography(colors: ColorPalette): Record<string, TextStyle> {
  return {
    h1: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
    h2: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
    body: { fontSize: 14, fontWeight: '400', color: colors.textPrimary },
    caption: { fontSize: 12, fontWeight: '400', color: colors.textSecondary },
    label: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.5 },
    amount: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  };
}
