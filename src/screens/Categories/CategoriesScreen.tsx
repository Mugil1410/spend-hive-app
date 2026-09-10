import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { TopHeader } from '@/components/TopHeader';
import { CategoryIcon } from '@/components/CategoryIcon';
import { FAB } from '@/components/FAB';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { CategoryType } from '@/types';

export function CategoriesScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { categories } = useStore();
  const [tab, setTab] = useState<CategoryType>('EXPENSE');

  const filtered = useMemo(
    () => categories.filter((c) => c.type === tab).sort((a, b) => a.name.localeCompare(b.name)),
    [categories, tab]
  );

  return (
    <View style={styles.container}>
      <TopHeader title="Categories" />
      <View style={styles.tabRow}>
        {(['EXPENSE', 'INCOME'] as CategoryType[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: colors.gold, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <Text style={[typography.h2, tab !== t && { color: colors.textSecondary }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View style={styles.grid}>
          {filtered.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.gridItem}
              onPress={() => navigation.navigate('FilteredTransactions', { categoryId: c.id, title: c.name })}
            >
              <View>
                <CategoryIcon icon={c.icon} color={c.color} size={52} />
                <TouchableOpacity
                  style={[styles.editBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  hitSlop={8}
                  onPress={() => navigation.navigate('CategoryForm', { categoryId: c.id })}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={11} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={typography.caption} numberOfLines={1}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('CategoryForm', { type: tab })}>
            <View style={styles.addCircle}>
              <Text style={{ color: colors.gold, fontSize: 24 }}>+</Text>
            </View>
            <Text style={typography.caption}>Add New</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <FAB onPress={() => navigation.navigate('CategoryForm', { type: tab })} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    tabRow: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.separator },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    gridItem: { width: 72, alignItems: 'center', gap: 6 },
    editBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: colors.gold,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
