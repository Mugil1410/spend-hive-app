export interface ColorPalette {
  background: string;
  surface: string;
  modalBackdrop: string;

  border: string;
  separator: string;

  gold: string;
  expense: string;
  income: string;

  textPrimary: string;
  textSecondary: string;
  textAccent: string;

  fabBase: string;

  amber: string;

  // Semantic aliases and surfaces added with the preset themes (src/theme/themes.ts).
  secondary: string;
  success: string;
  warning: string;
  error: string;
  inputBackground: string;
  navBackground: string;
}

export const darkColors: ColorPalette = {
  background: '#262523',
  surface: '#343330',
  modalBackdrop: 'rgba(26, 25, 24, 0.8)',

  border: '#484742',
  separator: '#3D3C38',

  gold: '#F5E59F',
  expense: '#E86759',
  income: '#50B98A',

  textPrimary: '#FFFFFF',
  textSecondary: '#A6A59E',
  textAccent: '#F5E59F',

  fabBase: '#3A3935',

  amber: '#E0A94A',

  secondary: '#E0A94A',
  success: '#50B98A',
  warning: '#E0A94A',
  error: '#E86759',
  inputBackground: '#2E2D2A',
  navBackground: '#343330',
};

export const lightColors: ColorPalette = {
  background: '#FAF9F6',
  surface: '#FFFFFF',
  modalBackdrop: 'rgba(38, 37, 35, 0.4)',

  border: '#E2DFD8',
  separator: '#EAE7DF',

  gold: '#B8932E',
  expense: '#D14C3D',
  income: '#2E9A66',

  textPrimary: '#262523',
  textSecondary: '#7A776E',
  textAccent: '#B8932E',

  fabBase: '#EDEAE2',

  amber: '#B8792E',

  secondary: '#B8792E',
  success: '#2E9A66',
  warning: '#B8792E',
  error: '#D14C3D',
  inputBackground: '#F3F1EC',
  navBackground: '#FFFFFF',
};

export const radius = {
  card: 14,
  pill: 999,
  sm: 8,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};
