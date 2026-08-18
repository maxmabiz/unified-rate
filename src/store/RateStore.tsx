import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { HISTORY_CALENDAR_DAYS, HISTORY_SEED_DAYS } from '@/constants';
import type { AppSnapshot, BufferConfig, DateRange, EnrichedPair, FxPairState, RateDailyRow } from '@/types';
import { createInitialSnapshot, mockBarForDate, tradingBars } from '@/mock/seed';
import { calendarDaysInRange, lastNCalendarDays, nowText } from '@/utils/date';
import {
  averageFromHistory,
  computeQuotes,
  hasVolatilityWarning,
} from '@/utils/rateCalc';

interface RateStoreValue {
  lastSyncAt: string;
  lastSyncStatus: AppSnapshot['lastSyncStatus'];
  lastSyncRange?: DateRange;
  lastCalculatedAt: string;
  globalBuffer: BufferConfig;
  pairs: EnrichedPair[];
  dailyRows: RateDailyRow[];
  syncing: boolean;
  calculating: boolean;
  syncAll: (range: DateRange) => Promise<{ ok: boolean; error?: string }>;
  recalculate: () => void;
  saveGlobalBuffer: (config: BufferConfig) => void;
  savePairBuffer: (id: string, config: BufferConfig) => void;
}

const RateStoreContext = createContext<RateStoreValue | null>(null);

function enrich(pair: FxPairState): EnrichedPair {
  const quotes = computeQuotes(tradingBars(pair.history), {
    volatilityBuffer: pair.volatilityBuffer,
    fee: pair.fee,
  });
  return {
    ...pair,
    ...quotes,
    updateDate: pair.dataDate,
    hasVolatilityWarning: hasVolatilityWarning(pair.latestMarketRate, pair.previousMarketRate),
  };
}

function historyEndingAt(history: FxPairState['history'], dataDate: string) {
  return tradingBars(history.filter((bar) => bar.date <= dataDate));
}

export function flattenDailyRows(pairs: EnrichedPair[]): RateDailyRow[] {
  const rows: RateDailyRow[] = [];
  for (const pair of pairs) {
    const sorted = [...pair.history].sort((a, b) => a.date.localeCompare(b.date));
    const displayStart = lastNCalendarDays(pair.dataDate, HISTORY_CALENDAR_DAYS)[0];
    const visible = sorted.filter((bar) => bar.date >= displayStart);
    visible.forEach((bar) => {
      const barIndex = sorted.findIndex((item) => item.date === bar.date);
      const prevClose = barIndex > 0 ? sorted[barIndex - 1].close : pair.previousMarketRate;
      const warnAgainst = bar.date === pair.dataDate ? pair.previousMarketRate : prevClose;
      rows.push({
        id: `${pair.id}-${bar.date}`,
        pairId: pair.id,
        pair: pair.pair,
        pairLabel: pair.pairLabel,
        reutersCode: pair.reutersCode,
        dataDate: bar.date,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        latestMarketRate: bar.close,
        lastSyncAt: pair.lastSyncAt,
        syncStatus: pair.syncStatus,
        hasVolatilityWarning: hasVolatilityWarning(bar.close, warnAgainst),
        history: historyEndingAt(sorted, bar.date),
      });
    });
  }
  return rows.sort((a, b) => b.dataDate.localeCompare(a.dataDate) || a.pair.localeCompare(b.pair));
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function applySuccessfulSync(pair: FxPairState, syncedAt: string, rangeDays: string[]): FxPairState {
  const baseAvg = averageFromHistory(tradingBars(pair.history));
  const byDate = new Map(pair.history.map((bar) => [bar.date, bar]));
  for (const date of rangeDays) {
    byDate.set(date, mockBarForDate(date, baseAvg));
  }
  const history = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-HISTORY_SEED_DAYS);
  const latestBar = history[history.length - 1];
  const previousBar = history[history.length - 2];
  return {
    ...pair,
    history,
    previousMarketRate: previousBar?.close ?? pair.latestMarketRate,
    latestMarketRate: latestBar.close,
    dataDate: latestBar.date,
    lastSyncAt: syncedAt,
    syncStatus: '正常',
  };
}

let fullSyncCount = 0;

export function RateProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AppSnapshot>(() => createInitialSnapshot());
  const [syncing, setSyncing] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const pairs = useMemo(() => snapshot.pairs.map(enrich), [snapshot.pairs]);
  const dailyRows = useMemo(() => flattenDailyRows(pairs), [pairs]);

  const syncAll = useCallback(async (range: DateRange) => {
    if (syncing) return { ok: false, error: '正在同步中' };

    const rangeDays = calendarDaysInRange(range.start, range.end);
    if (rangeDays.length === 0) {
      return { ok: false, error: '请选择有效时间段' };
    }

    setSyncing(true);
    setSnapshot((prev) => ({
      ...prev,
      lastSyncStatus: '同步中',
      lastSyncRange: range,
      pairs: prev.pairs.map((pair) => ({
        ...pair,
        syncStatus: '同步中',
      })),
    }));
    await wait(1400);

    fullSyncCount += 1;
    const shouldFail = fullSyncCount % 3 === 0;
    const syncedAt = nowText();

    if (shouldFail) {
      setSnapshot((prev) => ({
        ...prev,
        lastSyncAt: syncedAt,
        lastSyncStatus: '失败',
        lastSyncRange: range,
        pairs: prev.pairs.map((pair) => ({
          ...pair,
          lastSyncAt: syncedAt,
          syncStatus: '失败',
        })),
      }));
      setSyncing(false);
      return { ok: false };
    }

    const calculatedAt = nowText(dayjs().add(2, 'second'));
    setSnapshot((prev) => ({
      ...prev,
      lastSyncAt: syncedAt,
      lastSyncStatus: '正常',
      lastSyncRange: range,
      lastCalculatedAt: calculatedAt,
      pairs: prev.pairs.map((pair) => applySuccessfulSync(pair, syncedAt, rangeDays)),
    }));
    setSyncing(false);
    return { ok: true };
  }, [syncing]);

  const recalculate = useCallback(() => {
    setCalculating(true);
    window.setTimeout(() => {
      setSnapshot((prev) => ({
        ...prev,
        lastCalculatedAt: nowText(),
      }));
      setCalculating(false);
    }, 400);
  }, []);

  const saveGlobalBuffer = useCallback((config: BufferConfig) => {
    setSnapshot((prev) => ({
      ...prev,
      globalBuffer: config,
      lastCalculatedAt: nowText(),
      pairs: prev.pairs.map((pair) => ({
        ...pair,
        volatilityBuffer: config.volatilityBuffer,
        fee: config.fee,
      })),
    }));
  }, []);

  const savePairBuffer = useCallback((id: string, config: BufferConfig) => {
    setSnapshot((prev) => ({
      ...prev,
      lastCalculatedAt: nowText(),
      pairs: prev.pairs.map((pair) =>
        pair.id === id
          ? { ...pair, volatilityBuffer: config.volatilityBuffer, fee: config.fee }
          : pair,
      ),
    }));
  }, []);

  const value = useMemo<RateStoreValue>(
    () => ({
      lastSyncAt: snapshot.lastSyncAt,
      lastSyncStatus: snapshot.lastSyncStatus,
      lastSyncRange: snapshot.lastSyncRange,
      lastCalculatedAt: snapshot.lastCalculatedAt,
      globalBuffer: snapshot.globalBuffer,
      pairs,
      dailyRows,
      syncing,
      calculating,
      syncAll,
      recalculate,
      saveGlobalBuffer,
      savePairBuffer,
    }),
    [
      snapshot.lastSyncAt,
      snapshot.lastSyncStatus,
      snapshot.lastSyncRange,
      snapshot.lastCalculatedAt,
      snapshot.globalBuffer,
      pairs,
      dailyRows,
      syncing,
      calculating,
      syncAll,
      recalculate,
      saveGlobalBuffer,
      savePairBuffer,
    ],
  );

  return <RateStoreContext.Provider value={value}>{children}</RateStoreContext.Provider>;
}

export function useRateStore() {
  const ctx = useContext(RateStoreContext);
  if (!ctx) {
    throw new Error('useRateStore 必须在 RateProvider 内使用');
  }
  return ctx;
}
