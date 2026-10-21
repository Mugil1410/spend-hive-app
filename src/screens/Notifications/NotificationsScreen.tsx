import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import ReanimatedSwipeable, { SwipeableMethods, SwipeDirection } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { MaterialDesignIcons as MaterialCommunityIcons } from '@react-native-vector-icons/material-design-icons/static';
import { format, formatDistanceToNowStrict, isToday, isYesterday } from 'date-fns';
import { useTheme } from '@/theme/ThemeContext';
import { radius } from '@/theme/colors';
import { StackHeader } from '@/components/StackHeader';
import { EmptyState } from '@/components/EmptyState';
import { AppNotification, NotificationCategory, useNotificationHistory, useUnreadCount } from '@/notifications/notificationHistory';
import { openNotificationTarget } from '@/notifications/notificationTaps';

const CATEGORY_META: Record<NotificationCategory, { icon: string; label: string }> = {
  loan: { icon: 'cash-minus', label: 'Loan due' },
  lent: { icon: 'cash-plus', label: 'Payment to collect' },
  daily: { icon: 'calendar-check-outline', label: 'Daily reminder' },
  test: { icon: 'bell-ring-outline', label: 'Test' },
  system: { icon: 'information-outline', label: 'Spend Hive' },
};

function formatWhen(ts: number) {
  if (isToday(ts)) return `${formatDistanceToNowStrict(ts, { addSuffix: true })} · ${format(ts, 'h:mm a')}`;
  if (isYesterday(ts)) return `Yesterday · ${format(ts, 'h:mm a')}`;
  return format(ts, 'd MMM yyyy · h:mm a');
}

export function NotificationsScreen() {
  const { colors, typography } = useTheme();
  const items = useNotificationHistory((s) => s.items);
  const hydrated = useNotificationHistory((s) => s.hydrated);
  const { markAllRead, clearAll } = useNotificationHistory.getState();
  const unread = useUnreadCount();

  function handleClearAll() {
    Alert.alert('Clear Notifications', 'Delete all notification history? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: clearAll },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StackHeader
        title="Notifications"
        right={
          items.length > 0 && (
            <>
              <TouchableOpacity onPress={markAllRead} disabled={unread === 0} hitSlop={10} accessibilityLabel="Mark all as read">
                <MaterialCommunityIcons name="check-all" size={24} color={unread === 0 ? colors.textSecondary : colors.gold} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClearAll} hitSlop={10} accessibilityLabel="Clear all notifications">
                <MaterialCommunityIcons name="delete-sweep-outline" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </>
          )
        }
      />
      {!hydrated ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={colors.gold} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          ListHeaderComponent={
            items.length > 0 ? (
              <Text style={[typography.caption, { marginBottom: 4 }]}>
                {unread > 0 ? `${unread} unread · ` : ''}Swipe right to mark read, left to delete
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState icon="bell-sleep-outline" message="No notifications yet. Reminders and alerts from Spend Hive will appear here." />
          }
          renderItem={({ item }) => <NotificationRow item={item} />}
        />
      )}
    </View>
  );
}

function NotificationRow({ item }: { item: AppNotification }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const swipeRef = useRef<SwipeableMethods>(null);
  const { markRead, remove } = useNotificationHistory.getState();
  const meta = CATEGORY_META[item.category] ?? CATEGORY_META.system;

  function handleOpen(direction: SwipeDirection.LEFT | SwipeDirection.RIGHT) {
    if (direction === SwipeDirection.RIGHT) {
      markRead(item.id);
      swipeRef.current?.close();
    } else {
      remove(item.id);
    }
  }

  function handlePress() {
    markRead(item.id);
    if (item.target && item.target.route !== 'Notifications') openNotificationTarget(item.target);
  }

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={1.5}
      leftThreshold={70}
      rightThreshold={70}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableOpen={handleOpen}
      renderLeftActions={() => (
        <View style={[styles.action, { backgroundColor: colors.income }]}>
          <MaterialCommunityIcons name="email-open-outline" size={22} color="#FFFFFF" />
          <Text style={styles.actionText}>{item.read ? 'Read' : 'Mark read'}</Text>
        </View>
      )}
      renderRightActions={() => (
        <View style={[styles.action, { backgroundColor: colors.expense }]}>
          <MaterialCommunityIcons name="delete-outline" size={22} color="#FFFFFF" />
          <Text style={styles.actionText}>Delete</Text>
        </View>
      )}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.card, !item.read && styles.cardUnread]}
        onPress={handlePress}
        accessibilityLabel={`${item.read ? '' : 'Unread. '}${item.title}. ${item.body}`}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.fabBase }]}>
          <MaterialCommunityIcons name={meta.icon as any} size={22} color={colors.gold} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.titleRow}>
            <Text style={[typography.body, { flex: 1, fontWeight: item.read ? '500' : '700' }]} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          {!!item.body && (
            <Text style={[typography.caption, { color: colors.textPrimary }]} numberOfLines={3}>
              {item.body}
            </Text>
          )}
          <View style={styles.metaRow}>
            <Text style={typography.caption}>{meta.label}</Text>
            <Text style={typography.caption}>{formatWhen(item.createdAt)}</Text>
          </View>
        </View>
        {item.target && item.target.route !== 'Notifications' && (
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
        )}
      </TouchableOpacity>
    </ReanimatedSwipeable>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    cardUnread: { borderColor: colors.gold },
    iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 4 },
    action: { width: 110, alignItems: 'center', justifyContent: 'center', borderRadius: radius.card, gap: 2 },
    actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  });
}
