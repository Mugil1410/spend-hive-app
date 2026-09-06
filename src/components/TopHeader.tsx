import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  title: string;
  onSearchPress?: () => void;
  onFilterPress?: () => void;
}

export function TopHeader({ title, onSearchPress, onFilterPress }: Props) {
  const navigation = useNavigation();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.row}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} hitSlop={10}>
          <MaterialCommunityIcons name="menu" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.h1, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.actions}>
          {onSearchPress && (
            <TouchableOpacity onPress={onSearchPress} hitSlop={10}>
              <MaterialCommunityIcons name="magnify" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          {onFilterPress && (
            <TouchableOpacity onPress={onFilterPress} hitSlop={10}>
              <MaterialCommunityIcons name="tune-variant" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    safe: { backgroundColor: colors.background },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    title: { flex: 1, textAlign: 'center' },
    actions: { flexDirection: 'row', gap: 16, minWidth: 26 },
  });
}
