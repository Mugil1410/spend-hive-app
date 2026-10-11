import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { FormScreen } from '@/components/FormScreen';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';
import { suggestLabels } from '@/utils/suggestions';

const ICONS = [
  'airplane', 'beach', 'ring', 'party-popper', 'firework', 'briefcase-outline',
  'tent', 'cake-variant', 'gift-outline', 'car', 'map-marker-outline', 'calendar-star',
];
const COLORS = ['#E86759', '#E0A94A', '#8E7CC3', '#6C8EBF', '#D06BB0', '#50B98A', '#F5E59F'];

export function EventFormModal() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const route = useRoute<RouteProp<RootStackParamList, 'EventForm'>>();
  const editingId = route.params?.eventId;

  const { events, addEvent, updateEvent, deleteEvent } = useStore();
  const editing = editingId ? events.find((e) => e.id === editingId) : undefined;

  const [name, setName] = useState(editing?.name ?? '');
  const [icon, setIcon] = useState(editing?.icon ?? ICONS[0]);
  const [color, setColor] = useState(editing?.color ?? COLORS[0]);

  const nameSuggestions = useMemo(() => {
    const items = events.filter((e) => e.id !== editingId).map((e) => ({ label: e.name }));
    return suggestLabels(name, items);
  }, [events, editingId, name]);

  const canSave = name.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    const payload = { name: name.trim(), icon, color };
    if (editingId) updateEvent(editingId, payload);
    else addEvent(payload);
    navigation.goBack();
  }

  function handleDelete() {
    if (!editingId) return;
    Alert.alert('Delete Event', 'This event will be archived. Existing transactions keep their reference.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteEvent(editingId); navigation.goBack(); } },
    ]);
  }

  return (
    <FormScreen
      title={editingId ? 'Edit Event' : 'New Event'}
      onCancel={() => navigation.goBack()}
      onSave={handleSave}
      saveDisabled={!canSave}
    >
      <Text style={typography.label}>NAME</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Goa Trip"
        placeholderTextColor={colors.textSecondary}
      />
      {nameSuggestions.length > 0 && (
        <View style={styles.suggestions}>
          {nameSuggestions.map((label) => (
            <TouchableOpacity key={label} style={styles.suggestionRow} onPress={() => setName(label)}>
              <MaterialCommunityIcons name="tag-outline" size={16} color={colors.textSecondary} />
              <Text style={typography.body}>Already have "{label}"?</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
          <Text style={{ color: colors.expense, fontWeight: '700' }}>Delete Event</Text>
        </TouchableOpacity>
      )}
    </FormScreen>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
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
    suggestions: {
      marginTop: 4,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12 },
    pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
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
