import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { TopHeader } from '@/components/TopHeader';
import { Card } from '@/components/Card';
import { SelectSheet, SelectOption } from '@/components/SelectSheet';
import { useStore, ThemeMode } from '@/store/useStore';
import { CURRENCIES } from '@/utils/currency';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function PreferencesScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { themeMode, setThemeMode, currency, setCurrency, notificationSettings, updateNotificationSettings } =
    useStore();
  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const currencyOptions: SelectOption[] = CURRENCIES.map((c) => ({
    id: c.code,
    label: `${c.label} (${c.symbol})`,
  }));
  const selectedCurrency = CURRENCIES.find((c) => c.code === currency);

  const [hour, minute] = notificationSettings.dailyReminderTime.split(':').map((n) => parseInt(n, 10));
  const timeValue = new Date();
  timeValue.setHours(hour || 0, minute || 0, 0, 0);

  return (
    <View style={styles.container}>
      <TopHeader title="Preferences" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={typography.label}>CURRENCY</Text>
        <Card>
          <TouchableOpacity style={styles.row} onPress={() => setCurrencySheetOpen(true)}>
            <MaterialCommunityIcons name="cash" size={22} color={colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={typography.body}>Currency</Text>
              <Text style={typography.caption}>{selectedCurrency?.label ?? 'Select currency'}</Text>
            </View>
            <Text style={[typography.body, { color: colors.gold, fontWeight: '700' }]}>{selectedCurrency?.symbol}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </Card>

        <Text style={[typography.label, { marginTop: 16 }]}>APP THEME</Text>
        <Card>
          <View style={styles.segmentRow}>
            {THEME_OPTIONS.map((opt) => {
              const active = themeMode === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => setThemeMode(opt.value)}
                >
                  <Text style={[typography.body, active && { color: colors.background, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Text style={[typography.label, { marginTop: 16 }]}>NOTIFICATIONS</Text>
        <Card>
          <ToggleRow
            icon="bell-outline"
            label="Enable Notifications"
            description="Master switch for all reminders below"
            value={notificationSettings.enabled}
            onChange={(v) => updateNotificationSettings({ enabled: v })}
          />
        </Card>

        <Text style={[typography.label, { marginTop: 16 }]}>REMINDERS</Text>
        <Card style={!notificationSettings.enabled && styles.disabledCard}>
          <ToggleRow
            icon="cash-minus"
            label="Loan Due Reminder"
            description="Notify when a loan payment is due"
            value={notificationSettings.loanDueEnabled}
            onChange={(v) => updateNotificationSettings({ loanDueEnabled: v })}
            disabled={!notificationSettings.enabled}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="cash-plus"
            label="Lent Due Reminder"
            description="Notify when a payment is due to collect"
            value={notificationSettings.lentDueEnabled}
            onChange={(v) => updateNotificationSettings({ lentDueEnabled: v })}
            disabled={!notificationSettings.enabled}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="calendar-check-outline"
            label="Daily Expense Reminder"
            description="A daily nudge to log today's spending"
            value={notificationSettings.dailyReminderEnabled}
            onChange={(v) => updateNotificationSettings({ dailyReminderEnabled: v })}
            disabled={!notificationSettings.enabled}
          />
          {notificationSettings.dailyReminderEnabled && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.row}
                onPress={() => setShowTimePicker(true)}
                disabled={!notificationSettings.enabled}
              >
                <MaterialCommunityIcons name="clock-outline" size={22} color={colors.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={typography.body}>Reminder Time</Text>
                  <Text style={typography.caption}>Daily at this time</Text>
                </View>
                <Text style={[typography.body, { color: colors.gold, fontWeight: '700' }]}>
                  {formatTime(hour, minute)}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Card>
      </ScrollView>

      <SelectSheet
        visible={currencySheetOpen}
        title="Select Currency"
        options={currencyOptions}
        selectedId={currency}
        onSelect={setCurrency}
        onClose={() => setCurrencySheetOpen(false)}
      />

      {showTimePicker && (
        <DateTimePicker
          value={timeValue}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            setShowTimePicker(false);
            if (selected) {
              const hh = String(selected.getHours()).padStart(2, '0');
              const mm = String(selected.getMinutes()).padStart(2, '0');
              updateNotificationSettings({ dailyReminderTime: `${hh}:${mm}` });
            }
          }}
        />
      )}
    </View>
  );
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${period}`;
}

function ToggleRow({
  icon,
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  icon: string;
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { colors, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <MaterialCommunityIcons name={icon as any} size={22} color={colors.gold} />
      <View style={{ flex: 1 }}>
        <Text style={typography.body}>{label}</Text>
        <Text style={typography.caption}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.gold }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    divider: { height: 1, backgroundColor: colors.separator, marginVertical: 4 },
    disabledCard: { opacity: 0.5 },
    segmentRow: { flexDirection: 'row', gap: 8 },
    segment: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    segmentActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  });
}
