import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, FlatList, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';
import { CategoryIcon } from './CategoryIcon';

export interface SelectOption {
  id: string;
  label: string;
  icon?: string;
  color?: string;
}

interface Props {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function SelectSheet({ visible, title, options, selectedId, onSelect, onClose }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card}>
          <Text style={[typography.h2, styles.title]}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item.id}
            style={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => {
              const active = item.id === selectedId;
              return (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => {
                    onSelect(item.id);
                    onClose();
                  }}
                >
                  {item.icon && item.color ? <CategoryIcon icon={item.icon} color={item.color} size={36} /> : null}
                  <Text style={[typography.body, styles.rowLabel, active && { color: colors.gold, fontWeight: '700' }]}>
                    {item.label}
                  </Text>
                  {active ? <MaterialCommunityIcons name="check" size={20} color={colors.gold} /> : null}
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: colors.modalBackdrop, justifyContent: 'flex-end' },
    card: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 8,
      maxHeight: '70%',
    },
    title: { textAlign: 'center', marginBottom: 8 },
    list: { flexGrow: 0 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    rowLabel: { flex: 1 },
    separator: { height: 1, backgroundColor: colors.separator },
    cancelButton: { alignItems: 'center', paddingVertical: 14, marginTop: 4, borderRadius: radius.pill },
  });
}
