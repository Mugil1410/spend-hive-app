import React, { useMemo, useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@/theme/ThemeContext';
import { FormScreen } from '@/components/FormScreen';
import { useStore } from '@/store/useStore';
import { RootStackParamList } from '@/navigation/types';

export function DebtorFormModal() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const route = useRoute<RouteProp<RootStackParamList, 'DebtorForm'>>();
  const editingId = route.params?.debtorId;

  const { debtors, findOrCreateDebtor, updateDebtor, deleteDebtor } = useStore();
  const editing = editingId ? debtors.find((d) => d.id === editingId) : undefined;

  const [name, setName] = useState(editing?.name ?? '');

  const canSave = name.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    if (editingId) {
      updateDebtor(editingId, { name: name.trim() });
    } else {
      findOrCreateDebtor(name.trim());
    }
    navigation.goBack();
  }

  function handleDelete() {
    if (!editingId) return;
    Alert.alert('Remove Debtor', 'This person will be archived. Their existing loan/lent records are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: () => { deleteDebtor(editingId); navigation.goBack(); } },
    ]);
  }

  return (
    <FormScreen
      title={editingId ? 'Edit Debtor' : 'New Debtor'}
      onCancel={() => navigation.goBack()}
      onSave={handleSave}
      saveDisabled={!canSave}
    >
      <Text style={typography.label}>NAME</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Rahul Sharma"
        placeholderTextColor={colors.textSecondary}
        autoFocus
      />

      {editingId && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={{ color: colors.expense, fontWeight: '700' }}>Archive Debtor</Text>
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
    deleteButton: { alignItems: 'center', marginTop: 24, paddingVertical: 10 },
  });
}
