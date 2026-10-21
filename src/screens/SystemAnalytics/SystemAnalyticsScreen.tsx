import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { MaterialDesignIcons as MaterialCommunityIcons } from '@react-native-vector-icons/material-design-icons/static';
import { format } from 'date-fns';
import { useTheme } from '@/theme/ThemeContext';
import { Card } from '@/components/Card';
import { StackHeader } from '@/components/StackHeader';
import { ProgressBar } from '@/components/ProgressBar';
import { EmptyState } from '@/components/EmptyState';
import { ConnectionType } from '@/native/SystemInfo';
import { useSystemMetrics } from './useSystemMetrics';

function formatBytes(bytes: number | null | undefined, digits = 1): string {
  if (bytes == null) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = bytes;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${v.toFixed(u === 0 ? 0 : digits)} ${units[u]}`;
}

function formatRate(bps: number | null) {
  return bps == null ? '—' : `${formatBytes(bps)}/s`;
}

function sumOrNull(a: number | null | undefined, b: number | null | undefined) {
  return a == null || b == null ? null : a + b;
}

const CONNECTION_META: Record<ConnectionType, { icon: string; label: string }> = {
  wifi: { icon: 'wifi', label: 'Wi-Fi' },
  cellular: { icon: 'signal-cellular-3', label: 'Mobile data' },
  ethernet: { icon: 'ethernet', label: 'Ethernet' },
  vpn: { icon: 'vpn', label: 'VPN' },
  bluetooth: { icon: 'bluetooth', label: 'Bluetooth' },
  other: { icon: 'lan', label: 'Other' },
  none: { icon: 'wifi-off', label: 'No connection' },
};

export function SystemAnalyticsScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const m = useSystemMetrics();
  const { memory, cpu, storage, network } = m;

  const ramUsed = memory ? memory.total - memory.available : null;
  const ramPct = memory && ramUsed != null ? (ramUsed / memory.total) * 100 : null;
  const storageUsed = storage ? storage.total - storage.available : null;
  const storagePct = storage && storageUsed != null ? (storageUsed / storage.total) * 100 : null;
  const appStorageTotal = storage ? storage.appCode + storage.appData : null;

  return (
    <View style={styles.container}>
      <StackHeader
        title="System Analytics"
        right={
          <TouchableOpacity onPress={m.refresh} hitSlop={10} accessibilityLabel="Refresh">
            <MaterialCommunityIcons name="refresh" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        }
      />
      {m.error && !memory ? (
        <EmptyState icon="chart-box-outline" message={m.error} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={m.refreshing} onRefresh={m.refresh} tintColor={colors.gold} colors={[colors.gold]} />}
        >
          <View style={styles.statusRow}>
            <View style={[styles.liveDot, { backgroundColor: m.live ? colors.income : colors.textSecondary }]} />
            <Text style={typography.caption}>
              {m.live ? 'Live · every 2s' : 'Paused'}
              {m.updatedAt ? ` · Updated ${format(m.updatedAt, 'h:mm:ss a')}` : ' · Loading…'}
            </Text>
          </View>
          {m.error && <Text style={[typography.caption, { color: colors.expense }]}>Last refresh failed: {m.error}</Text>}

          {/* RAM */}
          <Text style={typography.label}>MEMORY (RAM)</Text>
          <Card>
            <View style={styles.gaugeRow}>
              <Gauge percent={ramPct} color={ramPct != null && ramPct > 85 ? colors.expense : colors.gold} />
              <View style={{ flex: 1, gap: 6 }}>
                <Stat label="Used" value={formatBytes(ramUsed)} />
                <Stat label="Available" value={formatBytes(memory?.available)} />
                <Stat label="Total" value={formatBytes(memory?.total)} />
                <Stat label="Spend Hive" value={formatBytes(memory?.appUsed)} />
              </View>
            </View>
            {memory?.lowMemory && (
              <Text style={[typography.caption, { color: colors.amber, marginTop: 8 }]}>
                Android reports the device is low on memory.
              </Text>
            )}
            <Sparkline values={m.history.ramPct} max={100} color={colors.gold} />
          </Card>

          {/* CPU */}
          <Text style={typography.label}>PROCESSOR (CPU)</Text>
          <Card>
            <View style={styles.gaugeRow}>
              <Gauge percent={cpu?.deviceUsage ?? null} color={colors.secondary} caption="Device" />
              <View style={{ flex: 1, gap: 6 }}>
                <Stat label="Spend Hive usage" value={cpu?.appUsage != null ? `${cpu.appUsage.toFixed(1)}%` : '—'} />
                <Stat label="Cores" value={cpu ? String(cpu.cores) : '—'} />
                <Stat label="Chipset" value={cpu?.hardware ?? '—'} />
                <Stat label="Architecture" value={cpu?.abi ?? '—'} />
              </View>
            </View>
            {cpu && cpu.deviceUsage == null && (
              <Text style={[typography.caption, { marginTop: 8 }]}>
                Device-wide CPU usage is unavailable: Android 8+ only exposes it to system apps. Spend Hive's own usage
                and live core clock speeds are shown instead.
              </Text>
            )}
            <Sparkline values={m.history.appCpu} max={Math.max(5, ...m.history.appCpu)} color={colors.secondary} />
            {cpu && cpu.coreFrequencies.some((c) => c.currentKHz != null) && (
              <View style={{ marginTop: 10, gap: 6 }}>
                <Text style={typography.caption}>Core clock speeds</Text>
                {cpu.coreFrequencies.map((c, i) =>
                  c.currentKHz == null ? null : (
                    <View key={i} style={styles.coreRow}>
                      <Text style={[typography.caption, styles.coreLabel]}>CPU {i}</Text>
                      <View style={{ flex: 1 }}>
                        <ProgressBar percent={c.maxKHz ? (c.currentKHz / c.maxKHz) * 100 : 0} color={colors.secondary} height={6} />
                      </View>
                      <Text style={[typography.caption, styles.coreValue]}>{(c.currentKHz / 1000).toFixed(0)} MHz</Text>
                    </View>
                  )
                )}
              </View>
            )}
          </Card>

          {/* Storage */}
          <Text style={typography.label}>STORAGE</Text>
          <Card>
            <Text style={[typography.body, { fontWeight: '600' }]}>Device storage</Text>
            <View style={{ marginVertical: 8 }}>
              <ProgressBar percent={storagePct ?? 0} color={storagePct != null && storagePct > 90 ? colors.expense : colors.gold} height={10} />
            </View>
            <View style={styles.triple}>
              <Mini label="Used" value={formatBytes(storageUsed)} />
              <Mini label="Free" value={formatBytes(storage?.available)} />
              <Mini label="Total" value={formatBytes(storage?.total)} />
            </View>
            <View style={styles.divider} />
            <Text style={[typography.body, { fontWeight: '600' }]}>Used by Spend Hive</Text>
            <View style={{ gap: 6, marginTop: 8 }}>
              <Stat label="App" value={formatBytes(storage?.appCode)} />
              <Stat label="Data (incl. cache)" value={formatBytes(storage?.appData)} />
              <Stat label="Cache" value={formatBytes(storage?.appCache)} />
              <Stat label="Total" value={formatBytes(appStorageTotal)} bold />
            </View>
          </Card>

          {/* Network */}
          <Text style={typography.label}>NETWORK</Text>
          <Card>
            {network && (
              <View style={styles.connRow}>
                <MaterialCommunityIcons name={CONNECTION_META[network.type].icon as any} size={24} color={colors.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={typography.body}>{CONNECTION_META[network.type].label}</Text>
                  <Text style={typography.caption}>
                    {network.type === 'none'
                      ? 'Offline'
                      : network.validated
                        ? 'Connected to the internet'
                        : network.connected
                          ? 'Connected, internet not verified'
                          : 'No internet access'}
                    {network.type !== 'none' && network.metered ? ' · Metered' : ''}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: network.validated ? colors.income : colors.amber }]}>
                  <Text style={styles.chipText}>{network.validated ? 'ONLINE' : network.type === 'none' ? 'OFFLINE' : 'LIMITED'}</Text>
                </View>
              </View>
            )}
            <View style={[styles.triple, { marginTop: 12 }]}>
              <Mini label="↓ Download now" value={formatRate(m.rate.rx)} />
              <Mini label="↑ Upload now" value={formatRate(m.rate.tx)} />
            </View>
            <Sparkline values={m.history.rxRate} max={Math.max(1024, ...m.history.rxRate)} color={colors.income} />

            <View style={styles.divider} />
            <View style={styles.tableHead}>
              <Text style={[typography.caption, { flex: 1 }]}>Since last restart</Text>
              <Text style={[typography.caption, styles.col]}>Received</Text>
              <Text style={[typography.caption, styles.col]}>Sent</Text>
            </View>
            <NetRow label="Mobile data" rx={network?.mobileRx} tx={network?.mobileTx} />
            <NetRow label="Wi-Fi & other" rx={network?.otherRx} tx={network?.otherTx} />
            <NetRow label="Total" rx={network?.totalRx} tx={network?.totalTx} bold />
            <NetRow label="Spend Hive" rx={network?.appRx} tx={network?.appTx} />
            <Text style={[typography.caption, { marginTop: 8 }]}>
              Counters reset when the phone restarts
              {network ? ` (last restart ${format(network.since, 'd MMM, h:mm a')})` : ''}. Android doesn't give
              ordinary apps a separate Wi-Fi counter or long-term history, so "Wi-Fi & other" is total minus mobile
              data. Total {formatBytes(sumOrNull(network?.totalRx, network?.totalTx))}.
            </Text>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

function Gauge({ percent, color, caption }: { percent: number | null; color: string; caption?: string }) {
  const { colors, typography } = useTheme();
  const size = 96;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = percent == null ? 0 : Math.min(100, Math.max(0, percent));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.separator} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - pct / 100)}
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <Text style={[typography.h2, { fontSize: 20 }]}>{percent == null ? 'N/A' : `${pct.toFixed(0)}%`}</Text>
      {caption && <Text style={[typography.caption, { fontSize: 10 }]}>{caption}</Text>}
    </View>
  );
}

function Sparkline({ values, max, color }: { values: number[]; max: number; color: string }) {
  const width = 300;
  const height = 36;
  if (values.length < 2) return <View style={{ height, marginTop: 10 }} />;
  const step = width / (values.length - 1);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(height - (Math.min(v, max) / max) * (height - 2) - 1).toFixed(1)}`).join(' ');
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ marginTop: 10 }}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

function Stat({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const { typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <Text style={typography.caption}>{label}</Text>
      <Text style={[typography.body, { fontWeight: bold ? '700' : '600', flexShrink: 1, textAlign: 'right' }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  const { typography } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={typography.caption}>{label}</Text>
      <Text style={[typography.body, { fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

function NetRow({ label, rx, tx, bold }: { label: string; rx: number | null | undefined; tx: number | null | undefined; bold?: boolean }) {
  const { typography } = useTheme();
  const weight = bold ? '700' : '500';
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 4 }}>
      <Text style={[typography.body, { flex: 1, fontWeight: weight }]}>{label}</Text>
      <Text style={[typography.body, { width: 86, textAlign: 'right', fontWeight: weight }]}>{formatBytes(rx)}</Text>
      <Text style={[typography.body, { width: 86, textAlign: 'right', fontWeight: weight }]}>{formatBytes(tx)}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    liveDot: { width: 8, height: 8, borderRadius: 4 },
    gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    coreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    coreLabel: { width: 42 },
    coreValue: { width: 70, textAlign: 'right' },
    triple: { flexDirection: 'row', gap: 8 },
    divider: { height: 1, backgroundColor: colors.separator, marginVertical: 12 },
    connRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    chipText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    tableHead: { flexDirection: 'row', marginBottom: 4 },
    col: { width: 86, textAlign: 'right' },
  });
}
