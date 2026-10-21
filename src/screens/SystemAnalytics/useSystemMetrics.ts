import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { CpuInfo, MemoryInfo, NetworkInfo, StorageInfo, SystemInfo, isSystemInfoAvailable } from '@/native/SystemInfo';

const FAST_INTERVAL_MS = 2000; // RAM, CPU, network
const STORAGE_EVERY_N_TICKS = 8; // storage stats walk the filesystem; refresh ~every 16s
const HISTORY = 30;

export interface SystemMetrics {
  memory: MemoryInfo | null;
  cpu: CpuInfo | null;
  storage: StorageInfo | null;
  network: NetworkInfo | null;
  /** Recent samples, oldest first, for the sparklines. */
  history: { ramPct: number[]; appCpu: number[]; rxRate: number[]; txRate: number[] };
  /** Current device-wide throughput in bytes/s (null until two samples exist). */
  rate: { rx: number | null; tx: number | null };
  updatedAt: number | null;
  error: string | null;
  refreshing: boolean;
}

function push(list: number[], v: number) {
  const next = [...list, v];
  return next.length > HISTORY ? next.slice(next.length - HISTORY) : next;
}

/**
 * Polls the native SystemInfo module while the screen is focused and the app is in the
 * foreground; polling stops otherwise to save battery.
 */
export function useSystemMetrics() {
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [metrics, setMetrics] = useState<SystemMetrics>({
    memory: null,
    cpu: null,
    storage: null,
    network: null,
    history: { ramPct: [], appCpu: [], rxRate: [], txRate: [] },
    rate: { rx: null, tx: null },
    updatedAt: null,
    error: isSystemInfoAvailable ? null : 'System analytics is only available on Android.',
    refreshing: false,
  });
  const tick = useRef(0);
  const lastNet = useRef<{ at: number; rx: number; tx: number } | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  const sample = useCallback(async (withStorage: boolean) => {
    if (!isSystemInfoAvailable || inFlight.current) return;
    inFlight.current = true;
    try {
      const [memory, cpu, network, storage] = await Promise.all([
        SystemInfo.getMemoryInfo(),
        SystemInfo.getCpuInfo(),
        SystemInfo.getNetworkInfo(),
        withStorage ? SystemInfo.getStorageInfo() : Promise.resolve(null),
      ]);
      const now = Date.now();
      let rxRate: number | null = null;
      let txRate: number | null = null;
      if (network.totalRx != null && network.totalTx != null) {
        const prev = lastNet.current;
        if (prev && now > prev.at) {
          const secs = (now - prev.at) / 1000;
          rxRate = Math.max(0, (network.totalRx - prev.rx) / secs);
          txRate = Math.max(0, (network.totalTx - prev.tx) / secs);
        }
        lastNet.current = { at: now, rx: network.totalRx, tx: network.totalTx };
      }
      setMetrics((m) => ({
        memory,
        cpu,
        network,
        storage: storage ?? m.storage,
        history: {
          ramPct: push(m.history.ramPct, ((memory.total - memory.available) / memory.total) * 100),
          appCpu: cpu.appUsage != null ? push(m.history.appCpu, cpu.appUsage) : m.history.appCpu,
          rxRate: rxRate != null ? push(m.history.rxRate, rxRate) : m.history.rxRate,
          txRate: txRate != null ? push(m.history.txRate, txRate) : m.history.txRate,
        },
        rate: { rx: rxRate, tx: txRate },
        updatedAt: now,
        error: null,
        refreshing: false,
      }));
    } catch (e) {
      setMetrics((m) => ({ ...m, error: e instanceof Error ? e.message : String(e), refreshing: false }));
    } finally {
      inFlight.current = false;
    }
  }, []);

  const live = focused && appActive;

  useEffect(() => {
    if (!live) return;
    // A gap in sampling would make the next throughput delta an average over the pause.
    lastNet.current = null;
    tick.current = 0;
    sample(true);
    const timer = setInterval(() => {
      tick.current += 1;
      sample(tick.current % STORAGE_EVERY_N_TICKS === 0);
    }, FAST_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [live, sample]);

  const refresh = useCallback(() => {
    setMetrics((m) => ({ ...m, refreshing: true }));
    sample(true);
  }, [sample]);

  return { ...metrics, live, refresh };
}
