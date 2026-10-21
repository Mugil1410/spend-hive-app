import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialDesignIcons as MaterialCommunityIcons } from '@react-native-vector-icons/material-design-icons/static';
import { useTheme } from '@/theme/ThemeContext';
import { radius } from '@/theme/colors';
import { DARK_THEMES, LIGHT_THEMES, ThemeDefinition } from '@/theme/themes';
import { useStore } from '@/store/useStore';

/** Preset theme picker: one horizontally scrolling row of preview cards per scheme. */
export function ThemeGallery() {
  const { typography, themeId } = useTheme();
  const darkThemeId = useStore((s) => s.darkThemeId);
  const lightThemeId = useStore((s) => s.lightThemeId);
  const setThemePreset = useStore((s) => s.setThemePreset);

  return (
    <View style={{ gap: 8 }}>
      {[
        { title: 'DARK THEMES', themes: DARK_THEMES, selected: darkThemeId },
        { title: 'LIGHT THEMES', themes: LIGHT_THEMES, selected: lightThemeId },
      ].map((group) => (
        <View key={group.title} style={{ gap: 8, marginTop: 8 }}>
          <Text style={typography.label}>{group.title}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
            {group.themes.map((t) => (
              <ThemeCard
                key={t.id}
                theme={t}
                selected={t.id === group.selected}
                active={t.id === themeId}
                onPress={() => setThemePreset(t.id, t.scheme)}
              />
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

function ThemeCard({
  theme,
  selected,
  active,
  onPress,
}: {
  theme: ThemeDefinition;
  selected: boolean;
  active: boolean;
  onPress: () => void;
}) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const c = theme.colors;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, selected && { borderColor: colors.gold, borderWidth: 2 }]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${theme.name} ${theme.scheme} theme${active ? ', active' : ''}`}
    >
      {/* Miniature screen in the theme's own colors. */}
      <View style={[styles.preview, { backgroundColor: c.background }]}>
        <View style={[styles.previewBar, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.previewLine, { backgroundColor: c.textPrimary, width: 34 }]} />
          <View style={[styles.previewDot, { backgroundColor: c.gold }]} />
        </View>
        <View style={[styles.previewCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.previewRow}>
            <View style={[styles.previewDot, { backgroundColor: c.income }]} />
            <View style={[styles.previewLine, { backgroundColor: c.textSecondary, flex: 1 }]} />
          </View>
          <View style={styles.previewRow}>
            <View style={[styles.previewDot, { backgroundColor: c.expense }]} />
            <View style={[styles.previewLine, { backgroundColor: c.textSecondary, flex: 1 }]} />
          </View>
        </View>
        <View style={[styles.previewPill, { backgroundColor: c.gold }]}>
          <View style={[styles.previewLine, { backgroundColor: c.background, width: 22 }]} />
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '600', flex: 1 }]} numberOfLines={1}>
          {theme.name}
        </Text>
        {selected && <MaterialCommunityIcons name="check-circle" size={16} color={colors.gold} />}
      </View>
      {active && (
        <View style={styles.activeBadge}>
          <Text style={[styles.activeText, { color: colors.background }]}>ACTIVE</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      width: 118,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    preview: { height: 96, padding: 8, gap: 6 },
    previewBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 6,
      height: 16,
      borderRadius: 4,
      borderWidth: StyleSheet.hairlineWidth,
    },
    previewCard: { borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, padding: 6, gap: 5 },
    previewRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    previewDot: { width: 7, height: 7, borderRadius: 3.5 },
    previewLine: { height: 4, borderRadius: 2, opacity: 0.8 },
    previewPill: { alignSelf: 'flex-end', height: 14, paddingHorizontal: 8, borderRadius: 7, justifyContent: 'center' },
    footer: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 8 },
    activeBadge: {
      position: 'absolute',
      top: 6,
      left: 6,
      backgroundColor: colors.gold,
      borderRadius: 999,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    activeText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  });
}
