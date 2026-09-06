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
