import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialDesignIcons as MaterialCommunityIcons } from '@react-native-vector-icons/material-design-icons/static';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import { useUnreadCount } from '@/notifications/notificationHistory';
import { useTheme } from '@/theme/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  title: string;
  onSearchPress?: () => void;
  onFilterPress?: () => void;
  onPersonPress?: () => void;
  filterActive?: boolean;
}

export function TopHeader({ title, onSearchPress, onFilterPress, onPersonPress, filterActive }: Props) {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors, typography } = useTheme();
  const unread = useUnreadCount();
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
          {onPersonPress && (
            <TouchableOpacity onPress={onPersonPress} hitSlop={10}>
              <MaterialCommunityIcons name="account-multiple-outline" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          {onSearchPress && (
            <TouchableOpacity onPress={onSearchPress} hitSlop={10}>
              <MaterialCommunityIcons name="magnify" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          {onFilterPress && (
            <TouchableOpacity onPress={onFilterPress} hitSlop={10}>
              <MaterialCommunityIcons
                name="tune-variant"
                size={22}
                color={filterActive ? colors.gold : colors.textPrimary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            hitSlop={10}
            accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          >
            <MaterialCommunityIcons name={unread > 0 ? 'bell-badge-outline' : 'bell-outline'} size={24} color={colors.textPrimary} />
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </TouchableOpacity>
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
    badge: {
      position: 'absolute',
      top: -6,
      right: -8,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor: colors.expense,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.background,
    },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  });
}
