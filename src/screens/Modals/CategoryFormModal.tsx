import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { CategoryType } from '@/types';

const ICONS = [
  'film', 'silverware-fork-knife', 'file-document', 'bus', 'shopping', 'heart-pulse',
  'cart', 'cash-multiple', 'gift', 'laptop', 'home', 'school', 'gas-station', 'paw',
  'airplane', 'dumbbell',
];
const COLORS = ['#E86759', '#E0A94A', '#8E7CC3', '#6C8EBF', '#D06BB0', '#50B98A', '#F5E59F'];

export function CategoryFormModal() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const route = useRoute<RouteProp<RootStackParamList, 'CategoryForm'>>();
  const editingId = route.params?.categoryId;

  const { categories, addCategory, updateCategory, deleteCategory } = useStore();
  const editing = editingId ? categories.find((c) => c.id === editingId) : undefined;

  const [name, setName] = useState(editing?.name ?? '');
  const [type, setType] = useState<CategoryType>(editing?.type ?? route.params?.type ?? 'EXPENSE');
  const [icon, setIcon] = useState(editing?.icon ?? ICONS[0]);
  const [color, setColor] = useState(editing?.color ?? COLORS[0]);

  const canSave = name.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    const payload = { name: name.trim(), type, icon, color };
    if (editingId) updateCategory(editingId, payload);
    else addCategory(payload);
    navigation.goBack();
  }

  function handleDelete() {
    if (!editingId) return;
    Alert.alert('Delete Category', 'This category will be removed. Existing transactions keep their reference.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteCategory(editingId); navigation.goBack(); } },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={typography.h2}>{editingId ? 'Edit Category' : 'New Category'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={!canSave}>
          <Text style={[styles.save, !canSave && { opacity: 0.4 }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body}>
        <Text style={typography.label}>NAME</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Travel"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={[typography.label, { marginTop: 16 }]}>TYPE</Text>
        <View style={styles.pillsRow}>
          {(['EXPENSE', 'INCOME'] as CategoryType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.pill, type === t && styles.pillActive]}
              onPress={() => setType(t)}
            >
              <Text style={[typography.body, type === t && { color: colors.background }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[typography.label, { marginTop: 16 }]}>ICON</Text>
        <View style={styles.pillsRow}>
          {ICONS.map((i) => (
            <TouchableOpacity
              key={i}
              style={[styles.iconCircle, icon === i && { borderColor: colors.gold }]}
              onPress={() => setIcon(i)}
            >
              <MaterialCommunityIcons name={i as any} size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[typography.label, { marginTop: 16 }]}>COLOR</Text>
        <View style={styles.pillsRow}>
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorCircle, { backgroundColor: c }, color === c && styles.colorSelected]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        {editingId && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={{ color: colors.expense, fontWeight: '700' }}>Delete Category</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    cancel: { color: colors.textSecondary, fontSize: 14 },
    save: { color: colors.gold, fontSize: 14, fontWeight: '700' },
    body: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    input: {
      marginTop: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
    pill: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
    colorSelected: { borderColor: colors.textPrimary },
    deleteButton: { alignItems: 'center', marginTop: 24, marginBottom: 24, paddingVertical: 10 },
  });
}
