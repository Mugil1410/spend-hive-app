import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialDesignIcons as MaterialCommunityIcons } from '@react-native-vector-icons/material-design-icons/static';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  title: string;
  /** Optional actions on the right (icon buttons, text buttons). */
  right?: React.ReactNode;
}

/** Header with a back arrow, for screens pushed on the root stack (as opposed to TopHeader's drawer menu). */
export function StackHeader({ title, right }: Props) {
  const navigation = useNavigation();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.row}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} accessibilityLabel="Back">
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[typography.h2, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.actions}>{right}</View>
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
      gap: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    title: { flex: 1 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  });
}
