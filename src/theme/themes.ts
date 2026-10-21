import { ColorPalette, darkColors, lightColors } from './colors';

export type ThemeScheme = 'light' | 'dark';

export interface ThemeDefinition {
  id: string;
  name: string;
  scheme: ThemeScheme;
  colors: ColorPalette;
}

interface PaletteSeed {
  background: string;
  surface: string;
  border: string;
  separator: string;
  primary: string;
  secondary: string;
  textPrimary: string;
  textSecondary: string;
  fabBase: string;
  expense: string;
  income: string;
  amber: string;
  inputBackground: string;
}

// Fills the aliased keys so every preset only declares its distinct colors once.
function palette(scheme: ThemeScheme, s: PaletteSeed): ColorPalette {
  return {
    background: s.background,
    surface: s.surface,
    modalBackdrop: scheme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(20, 20, 24, 0.35)',
    border: s.border,
    separator: s.separator,
    gold: s.primary,
    expense: s.expense,
    income: s.income,
    textPrimary: s.textPrimary,
    textSecondary: s.textSecondary,
    textAccent: s.primary,
    fabBase: s.fabBase,
    amber: s.amber,
    secondary: s.secondary,
    success: s.income,
    warning: s.amber,
    error: s.expense,
    inputBackground: s.inputBackground,
    navBackground: s.surface,
  };
}

function dark(id: string, name: string, seed: PaletteSeed): ThemeDefinition {
  return { id, name, scheme: 'dark', colors: palette('dark', seed) };
}

function light(id: string, name: string, seed: PaletteSeed): ThemeDefinition {
  return { id, name, scheme: 'light', colors: palette('light', seed) };
}

export const DARK_THEMES: ThemeDefinition[] = [
  // The original SpendHive dark palette, kept as the default.
  { id: 'charcoal', name: 'Charcoal', scheme: 'dark', colors: darkColors },
  dark('midnight', 'Midnight', {
    background: '#0F1420', surface: '#1A2132', border: '#2A3348', separator: '#222A3D',
    primary: '#F5C46B', secondary: '#7AA2F7', textPrimary: '#F2F4F8', textSecondary: '#98A2B8',
    fabBase: '#232B3F', expense: '#F07167', income: '#4CC38A', amber: '#F2A541', inputBackground: '#151B2A',
  }),
  dark('ocean-blue', 'Ocean Blue', {
    background: '#0B1B2B', surface: '#13283D', border: '#22405C', separator: '#1A3349',
    primary: '#5EC8F2', secondary: '#7FE0D6', textPrimary: '#EAF6FF', textSecondary: '#8FB0C9',
    fabBase: '#1A3349', expense: '#FF7A7A', income: '#43D3A0', amber: '#FFB547', inputBackground: '#0F2133',
  }),
  dark('forest-green', 'Forest Green', {
    background: '#0E1A14', surface: '#17271E', border: '#27412F', separator: '#1E3326',
    primary: '#8FD694', secondary: '#D9C27A', textPrimary: '#EEF6EF', textSecondary: '#95AE9B',
    fabBase: '#1E3326', expense: '#EF7C6B', income: '#6BD58E', amber: '#E3B54F', inputBackground: '#132119',
  }),
  dark('royal-purple', 'Royal Purple', {
    background: '#17112A', surface: '#221A3B', border: '#362B57', separator: '#2B2247',
    primary: '#C9A7FF', secondary: '#F0B3E8', textPrimary: '#F4F0FF', textSecondary: '#A99DC6',
    fabBase: '#2B2247', expense: '#FF7B93', income: '#5FD3A5', amber: '#F5B85A', inputBackground: '#1C1532',
  }),
  dark('deep-teal', 'Deep Teal', {
    background: '#0A1F1F', surface: '#123030', border: '#1F4747', separator: '#183B3B',
    primary: '#4FD1C5', secondary: '#F6C26B', textPrimary: '#E8FAF8', textSecondary: '#8BB5B1',
    fabBase: '#183B3B', expense: '#F28B82', income: '#6EE7B7', amber: '#F6C26B', inputBackground: '#0E2828',
  }),
  dark('crimson-night', 'Crimson Night', {
    background: '#1A0F12', surface: '#29171C', border: '#42252D', separator: '#351E24',
    primary: '#F4B183', secondary: '#E8576B', textPrimary: '#FBEFF1', textSecondary: '#B99BA2',
    fabBase: '#351E24', expense: '#FF6B6B', income: '#5DCB97', amber: '#F3B04C', inputBackground: '#221317',
  }),
  dark('graphite', 'Graphite', {
    background: '#18191B', surface: '#232427', border: '#35373B', separator: '#2C2E31',
    primary: '#B8C4D6', secondary: '#8E9AAF', textPrimary: '#F5F6F7', textSecondary: '#9A9EA6',
    fabBase: '#2C2E31', expense: '#EF6F6C', income: '#4FBF8B', amber: '#E6A846', inputBackground: '#1E1F22',
  }),
  dark('indigo-night', 'Indigo Night', {
    background: '#11132B', surface: '#1B1E3D', border: '#2D3160', separator: '#24284F',
    primary: '#8C9EFF', secondary: '#B39DDB', textPrimary: '#EEF0FF', textSecondary: '#9DA2CC',
    fabBase: '#24284F', expense: '#FF7E79', income: '#4DD4A0', amber: '#F7BC5C', inputBackground: '#161935',
  }),
  dark('emerald-dark', 'Emerald Dark', {
    background: '#08170F', surface: '#0F2519', border: '#1C3D2A', separator: '#153121',
    primary: '#34D399', secondary: '#FCD34D', textPrimary: '#ECFDF5', textSecondary: '#8DB5A0',
    fabBase: '#153121', expense: '#F87171', income: '#4ADE80', amber: '#FBBF24', inputBackground: '#0C1F15',
  }),
];

export const LIGHT_THEMES: ThemeDefinition[] = [
  // The original SpendHive light palette, kept as the default.
  { id: 'warm-sand', name: 'Warm Sand', scheme: 'light', colors: lightColors },
  light('classic-light', 'Classic Light', {
    background: '#F5F6F8', surface: '#FFFFFF', border: '#DDE1E7', separator: '#E8EBEF',
    primary: '#2F5BEA', secondary: '#0E9F9E', textPrimary: '#1B1F27', textSecondary: '#6B7280',
    fabBase: '#E9ECF1', expense: '#D64545', income: '#1F9D62', amber: '#C27C0E', inputBackground: '#F0F2F5',
  }),
  light('sky-blue', 'Sky Blue', {
    background: '#EEF6FC', surface: '#FFFFFF', border: '#CFE3F2', separator: '#DEECF7',
    primary: '#1E7FC2', secondary: '#48A9E6', textPrimary: '#0F2A3F', textSecondary: '#5D7890',
    fabBase: '#DDEBF6', expense: '#D9534F', income: '#1E9C6B', amber: '#C7801A', inputBackground: '#EAF3FA',
  }),
  light('mint-green', 'Mint Green', {
    background: '#EFFAF4', surface: '#FFFFFF', border: '#CDEBDA', separator: '#DEF2E6',
    primary: '#14845A', secondary: '#4CBF8F', textPrimary: '#10291D', textSecondary: '#5C7A6B',
    fabBase: '#DCF1E5', expense: '#D2504A', income: '#1F9D55', amber: '#B97A12', inputBackground: '#EAF6EF',
  }),
  light('lavender', 'Lavender', {
    background: '#F6F3FC', surface: '#FFFFFF', border: '#E1D8F2', separator: '#EBE5F7',
    primary: '#6B4FBB', secondary: '#A57FE0', textPrimary: '#221A35', textSecondary: '#73698A',
    fabBase: '#ECE6F7', expense: '#D14B62', income: '#2E9A6E', amber: '#B97A1E', inputBackground: '#F1EDF9',
  }),
  light('rose-pink', 'Rose Pink', {
    background: '#FDF3F5', surface: '#FFFFFF', border: '#F2D5DC', separator: '#F7E3E8',
    primary: '#C2416B', secondary: '#E58AA6', textPrimary: '#34161F', textSecondary: '#8A6470',
    fabBase: '#F7E3E8', expense: '#C9372C', income: '#2B9467', amber: '#BD7A16', inputBackground: '#FAEDF0',
  }),
  light('arctic-blue', 'Arctic Blue', {
    background: '#F2F7F9', surface: '#FFFFFF', border: '#D3E2E8', separator: '#E2ECF0',
    primary: '#0E7490', secondary: '#3BA6C8', textPrimary: '#0F2530', textSecondary: '#5E7580',
    fabBase: '#E2ECF0', expense: '#D04848', income: '#15885A', amber: '#B7791F', inputBackground: '#EDF4F7',
  }),
  light('soft-peach', 'Soft Peach', {
    background: '#FFF6F0', surface: '#FFFFFF', border: '#F3DCCB', separator: '#F8E8DC',
    primary: '#C8551F', secondary: '#F2A65A', textPrimary: '#3A2116', textSecondary: '#8C6A5A',
    fabBase: '#F8E8DC', expense: '#C93A3A', income: '#2C8F5E', amber: '#B87316', inputBackground: '#FCEFE6',
  }),
  light('sage-green', 'Sage Green', {
    background: '#F3F6F1', surface: '#FFFFFF', border: '#D8E0D2', separator: '#E5EBE0',
    primary: '#557A44', secondary: '#94AE7F', textPrimary: '#1F2A1A', textSecondary: '#6B7864',
    fabBase: '#E5EBE0', expense: '#C2473D', income: '#3E8E5A', amber: '#B07A1F', inputBackground: '#EDF1EA',
  }),
  light('clean-white', 'Clean White', {
    background: '#FFFFFF', surface: '#FAFAFA', border: '#E6E6E6', separator: '#EFEFEF',
    primary: '#111827', secondary: '#4B5563', textPrimary: '#111111', textSecondary: '#6B6B6B',
    fabBase: '#F2F2F2', expense: '#DC2626', income: '#16A34A', amber: '#B45309', inputBackground: '#F4F4F5',
  }),
];

export const DEFAULT_DARK_THEME_ID = 'charcoal';
export const DEFAULT_LIGHT_THEME_ID = 'warm-sand';

const ALL_THEMES = [...DARK_THEMES, ...LIGHT_THEMES];

/** Looks a preset up by id, falling back to the scheme's default (e.g. an id from a newer backup). */
export function getTheme(id: string | undefined, scheme: ThemeScheme): ThemeDefinition {
  const found = ALL_THEMES.find((t) => t.id === id && t.scheme === scheme);
  if (found) return found;
  const fallback = scheme === 'dark' ? DEFAULT_DARK_THEME_ID : DEFAULT_LIGHT_THEME_ID;
  return ALL_THEMES.find((t) => t.id === fallback)!;
}
