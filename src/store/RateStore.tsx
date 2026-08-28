import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { CURRENT_OPERATOR, HISTORY_CALENDAR_DAYS, HISTORY_SEED_DAYS } from '@/constants';
import type {
  AppSnapshot,
  BufferConfig,
  ConfigChangeLog,
  DateRange,
  EnrichedPair,
  FxPairState,
  OfficialQuote,
  PairConfigInput,
  RateDailyRow,
  RateSource,
  SourceFeed,
} from '@/types';
import { RATE_SOURCE_IDS } from '@/types';
import { createInitialSnapshot, createConfiguredPair, mockBarForDate } from '@/mock/seed';
import { calendarDaysInRange, lastNCalendarDays, nowText, tradingBars } from '@/utils/date';
import { openQuoteDate, rebuildOpenDayQuotes, buildOfficialQuote, upsertQuote } from '@/utils/officialQuote';
import { applyGlobalBuffer } from '@/utils/buffer';
import {
  averageFromHistory,
  barHasVolatilityWarning,
  computeQuotes,
  tradingDayChangeRatio,
} from '@/utils/rateCalc';
import { buildChangeLog, pairStatusChangeAction, pairStatusChangeDetail } from '@/utils/changeLog';
import { quoteFeed, quoteSourceChangeDetail } from '@/utils/source';

interface RateStoreValue {
  sourceSync: AppSnapshot['sourceSync'];
  lastCalculatedAt: string;
  globalBuffer: BufferConfig;
  pairs: EnrichedPair[];
  officialQuotes: OfficialQuote[];
  changeLogs: ConfigChangeLog[];
  unlockedQuoteDate?: string;
  dailyRows: RateDailyRow[];
  syncing: boolean;
  calculating: boolean;
  syncAll: (range: DateRange, sources: RateSource[]) => Promise<{ ok: boolean; error?: string }>;
  recalculate: () => void;
  saveGlobalBuffer: (config: BufferConfig) => void;
  savePairBuffer: (id: string, config: BufferConfig) => void;
  restorePairBuffer: (id: string) => void;
  addPair: (input: PairConfigInput) => { ok: boolean; error?: string };
  setQuoteSource: (id: string, source: RateSource) => { ok: boolean; error?: string };
  setPairEnabled: (id: string, enabled: boolean) => { ok: boolean; error?: string };
}

const RateStoreContext = createContext<RateStoreValue | null>(null);

function enrich(pair: FxPairState, globalBuffer: BufferConfig): EnrichedPair {
  const feed = quoteFeed(pair);
  const quotes = computeQuotes(tradingBars(feed.history), globalBuffer);
  return {
    ...pair,
    ...quotes,
    updateDate: feed.dataDate,
  };
}

function historyEndingAt(history: SourceFeed['history'], dataDate: string) {
  return tradingBars(history.filter((bar) => bar.date <= dataDate));
}

export function flattenDailyRows(pairs: EnrichedPair[]): RateDailyRow[] {
  const rows: RateDailyRow[] = [];
  for (const pair of pairs) {
    for (const source of RATE_SOURCE_IDS) {
      const feed = pair.feeds[source];
      if (!feed.history.length) continue;
      const sorted = [...feed.history].sort((a, b) => a.date.localeCompare(b.date));
      const displayStart = lastNCalendarDays(feed.dataDate || sorted[sorted.length - 1].date, HISTORY_CALENDAR_DAYS)[0];
      const visible = sorted.filter((bar) => bar.date >= displayStart);
      visible.forEach((bar) => {
        const change = tradingDayChangeRatio(sorted, bar.date, bar.close);
        rows.push({
          id: `${pair.id}-${source}-${bar.date}`,
          pairId: pair.id,
          pair: pair.pair,
          pairLabel: pair.pairLabel,
          source,
          sourceCode: feed.code,
          dataDate: bar.date,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          changeRatio: change ? change.toFixed(8) : null,
          latestMarketRate: bar.close,
          lastSyncAt: feed.lastSyncAt,
          syncStatus: feed.syncStatus,
          hasVolatilityWarning: barHasVolatilityWarning(sorted, bar.date, bar.close),
          history: historyEndingAt(sorted, bar.date),
        });
      });
    }
  }
  return rows.sort(
    (a, b) =>
      b.dataDate.localeCompare(a.dataDate) ||
      a.pair.localeCompare(b.pair) ||
      a.source.localeCompare(b.source),
  );
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function applySuccessfulSync(feed: SourceFeed, syncedAt: string, rangeDays: string[]): SourceFeed {
  const baseAvg = averageFromHistory(tradingBars(feed.history));
  const byDate = new Map(feed.history.map((bar) => [bar.date, bar]));
  for (const date of rangeDays) {
    byDate.set(date, mockBarForDate(date, baseAvg));
  }
  const history = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-HISTORY_SEED_DAYS);
  const latestBar = history[history.length - 1];
  return {
    ...feed,
    history,
    latestMarketRate: latestBar.close,
    dataDate: latestBar.date,
    lastSyncAt: syncedAt,
    syncStatus: '正常',
  };
}

function validatePairConfig(input: {
  reutersCode: string;
  investingCode: string;
  reutersConnected: boolean;
  investingConnected: boolean;
  quoteSource: RateSource;
}): { ok: true } | { ok: false; error: string } {
  if (!input.reutersConnected && !input.investingConnected) {
    return { ok: false, error: '请至少接入一个数据源' };
  }
  if (input.reutersConnected && !input.reutersCode.trim()) {
    return { ok: false, error: '请填写 Reuters 代码' };
  }
  if (input.investingConnected && !input.investingCode.trim()) {
    return { ok: false, error: '请填写英为财经代码' };
  }
  if (input.quoteSource === 'reuters' && !input.reutersConnected) {
    return { ok: false, error: '报价数据源必须是已接入的数据源' };
  }
  if (input.quoteSource === 'investing' && !input.investingConnected) {
    return { ok: false, error: '报价数据源必须是已接入的数据源' };
  }
  return { ok: true };
}

const syncFailCount: Record<RateSource, number> = {
  reuters: 0,
  investing: 0,
};

export function RateProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AppSnapshot>(() => createInitialSnapshot());
  const [syncing, setSyncing] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const pairs = useMemo(
    () => snapshot.pairs.map((pair) => enrich(pair, snapshot.globalBuffer)),
    [snapshot.pairs, snapshot.globalBuffer],
  );
  const dailyRows = useMemo(() => flattenDailyRows(pairs), [pairs]);

  const syncAll = useCallback(async (range: DateRange, sources: RateSource[]) => {
    if (syncing) return { ok: false, error: '正在同步中' };

    const selected = sources.filter((source) => RATE_SOURCE_IDS.includes(source));
    if (selected.length === 0) {
      return { ok: false, error: '请选择至少一个数据源' };
    }

    const enabledPairs = snapshot.pairs.filter((pair) => pair.enabled);
    if (enabledPairs.length === 0) {
      return { ok: false, error: '请先启用至少一个货币对' };
    }

    const work = selected.filter((source) =>
      enabledPairs.some((pair) => pair.feeds[source].connected),
    );
    if (work.length === 0) {
      return { ok: false, error: '所选数据源没有已接入的启用货币对' };
    }

    const rangeDays = calendarDaysInRange(range.start, range.end);
    if (rangeDays.length === 0) {
      return { ok: false, error: '请选择有效时间段' };
    }

    setSyncing(true);
    setSnapshot((prev) => ({
      ...prev,
      sourceSync: {
        ...prev.sourceSync,
        ...Object.fromEntries(
          work.map((source) => [
            source,
            { ...prev.sourceSync[source], lastSyncStatus: '同步中', lastSyncRange: range },
          ]),
        ),
      },
      pairs: prev.pairs.map((pair) => ({
        ...pair,
        feeds: {
          reuters: pair.enabled && work.includes('reuters') && pair.feeds.reuters.connected
            ? { ...pair.feeds.reuters, syncStatus: '同步中' }
            : pair.feeds.reuters,
          investing: pair.enabled && work.includes('investing') && pair.feeds.investing.connected
            ? { ...pair.feeds.investing, syncStatus: '同步中' }
            : pair.feeds.investing,
        },
      })),
    }));
    await wait(1400);

    const syncedAt = nowText();
    const outcome: Record<RateSource, '正常' | '失败'> = {
      reuters: '正常',
      investing: '正常',
    };

    for (const source of work) {
      syncFailCount[source] += 1;
      outcome[source] = syncFailCount[source] % 3 === 0 ? '失败' : '正常';
    }

    const anyQuoteUpdated = snapshot.pairs.some(
      (pair) => pair.enabled && work.includes(pair.quoteSource) && pair.feeds[pair.quoteSource].connected && outcome[pair.quoteSource] === '正常',
    );

    setSnapshot((prev) => {
      const nextPairs = prev.pairs.map((pair) => ({
        ...pair,
        feeds: {
          reuters: patchFeedAfterSync(pair, 'reuters', work, outcome, syncedAt, rangeDays),
          investing: patchFeedAfterSync(pair, 'investing', work, outcome, syncedAt, rangeDays),
        },
      }));
      const calculatedAt = anyQuoteUpdated ? nowText(dayjs().add(2, 'second')) : prev.lastCalculatedAt;
      const quotePairIds = anyQuoteUpdated
        ? nextPairs
            .filter((pair) => pair.enabled && work.includes(pair.quoteSource) && outcome[pair.quoteSource] === '正常')
            .map((pair) => pair.id)
        : [];
      return {
        ...prev,
        lastCalculatedAt: calculatedAt,
        sourceSync: {
          ...prev.sourceSync,
          ...Object.fromEntries(
            work.map((source) => [
              source,
              {
                lastSyncAt: syncedAt,
                lastSyncStatus: outcome[source],
                lastSyncRange: range,
              },
            ]),
          ),
        },
        pairs: nextPairs,
        officialQuotes: quotePairIds.length
          ? rebuildOpenDayQuotes(
              nextPairs,
              prev.officialQuotes,
              calculatedAt,
              quotePairIds,
              prev.globalBuffer,
              true,
            )
          : prev.officialQuotes,
      };
    });
    setSyncing(false);

    if (work.every((source) => outcome[source] === '失败')) {
      return { ok: false };
    }
    if (work.some((source) => outcome[source] === '失败')) {
      return { ok: false, error: '部分数据源同步失败' };
    }
    return { ok: true };
  }, [syncing, snapshot.pairs]);

  const recalculate = useCallback(() => {
    setCalculating(true);
    window.setTimeout(() => {
      setSnapshot((prev) => {
        const calculatedAt = nowText();
        return {
          ...prev,
          lastCalculatedAt: calculatedAt,
          officialQuotes: rebuildOpenDayQuotes(
            prev.pairs,
            prev.officialQuotes,
            calculatedAt,
            undefined,
            prev.globalBuffer,
            true,
          ),
        };
      });
      setCalculating(false);
    }, 400);
  }, []);

  const saveGlobalBuffer = useCallback((config: BufferConfig) => {
    setSnapshot((prev) => ({
      ...prev,
      globalBuffer: config,
      pairs: applyGlobalBuffer(prev.pairs, config),
    }));
  }, []);

  const savePairBuffer = useCallback((id: string, config: BufferConfig) => {
    setSnapshot((prev) => {
      const unlocked = openQuoteDate(prev.pairs);
      const pair = prev.pairs.find((item) => item.id === id);
      if (!unlocked || !pair?.enabled) return prev;
      const calculatedAt = nowText();
      return {
        ...prev,
        lastCalculatedAt: calculatedAt,
        officialQuotes: upsertQuote(
          prev.officialQuotes,
          buildOfficialQuote(pair, unlocked, calculatedAt, config, true),
        ),
      };
    });
  }, []);

  const restorePairBuffer = useCallback((id: string) => {
    setSnapshot((prev) => {
      const unlocked = openQuoteDate(prev.pairs);
      const pair = prev.pairs.find((item) => item.id === id);
      if (!unlocked || !pair?.enabled) return prev;
      const calculatedAt = nowText();
      return {
        ...prev,
        lastCalculatedAt: calculatedAt,
        officialQuotes: upsertQuote(
          prev.officialQuotes,
          buildOfficialQuote(pair, unlocked, calculatedAt, prev.globalBuffer, false),
        ),
      };
    });
  }, []);

  const addPair = useCallback((input: PairConfigInput) => {
    const currency1 = input.currency1.trim().toUpperCase();
    const currency2 = input.currency2.trim().toUpperCase();
    if (!currency1 || !currency2) return { ok: false, error: '请选择基准货币和计价货币' };
    if (currency1 === currency2) return { ok: false, error: '基准货币和计价货币不能相同' };

    const checked = validatePairConfig(input);
    if (!checked.ok) return checked;

    const id = `${currency1}${currency2}`;
    const exists = snapshot.pairs.some((pair) => pair.id === id);
    if (exists) return { ok: false, error: '该货币对已存在，可直接启用' };

    const reutersCode = input.reutersCode.trim();
    const investingCode = input.investingCode.trim();
    if (input.reutersConnected && snapshot.pairs.some((pair) => pair.feeds.reuters.code === reutersCode)) {
      return { ok: false, error: 'Reuters 代码已被其他货币对使用' };
    }
    if (input.investingConnected && snapshot.pairs.some((pair) => pair.feeds.investing.code === investingCode)) {
      return { ok: false, error: '英为财经代码已被其他货币对使用' };
    }

    setSnapshot((prev) => {
      const calculatedAt = nowText();
      const nextPairs = [
        ...prev.pairs,
        createConfiguredPair(
          {
            currency1,
            currency2,
            reutersCode,
            investingCode,
            reutersConnected: input.reutersConnected,
            investingConnected: input.investingConnected,
            quoteSource: input.quoteSource,
          },
          prev.globalBuffer,
          calculatedAt,
        ),
      ];
      return {
        ...prev,
        lastCalculatedAt: calculatedAt,
        pairs: nextPairs,
        officialQuotes: rebuildOpenDayQuotes(nextPairs, prev.officialQuotes, calculatedAt, [id], prev.globalBuffer),
      };
    });
    return { ok: true };
  }, [snapshot.pairs]);

  const setQuoteSource = useCallback((id: string, source: RateSource) => {
    const target = snapshot.pairs.find((pair) => pair.id === id);
    if (!target) return { ok: false, error: '货币对不存在' };
    if (!target.feeds[source].connected) {
      return { ok: false, error: '请选择已接入的数据源' };
    }
    if (target.quoteSource === source) {
      return { ok: false, error: '报价数据源未变化' };
    }

    setSnapshot((prev) => {
      const pair = prev.pairs.find((item) => item.id === id);
      if (!pair || pair.quoteSource === source || !pair.feeds[source].connected) return prev;
      const changedAt = nowText();
      const log = buildChangeLog({
        pairId: id,
        pairLabel: pair.pairLabel,
        action: '更改数据源',
        detail: quoteSourceChangeDetail(pair.quoteSource, source),
        changedAt,
        operator: CURRENT_OPERATOR,
      });
      return {
        ...prev,
        pairs: prev.pairs.map((item) =>
          item.id === id ? { ...item, quoteSource: source, configUpdatedAt: changedAt } : item,
        ),
        changeLogs: [log, ...prev.changeLogs],
      };
    });
    return { ok: true };
  }, [snapshot.pairs]);

  const setPairEnabled = useCallback((id: string, enabled: boolean) => {
    const target = snapshot.pairs.find((pair) => pair.id === id);
    if (!target) return { ok: false, error: '货币对不存在' };
    if (target.enabled === enabled) return { ok: true };

    setSnapshot((prev) => {
      const pair = prev.pairs.find((item) => item.id === id);
      if (!pair || pair.enabled === enabled) return prev;
      const calculatedAt = nowText();
      const nextPairs = prev.pairs.map((item) =>
        item.id === id ? { ...item, enabled, configUpdatedAt: calculatedAt } : item,
      );
      const log = buildChangeLog({
        pairId: id,
        pairLabel: pair.pairLabel,
        action: pairStatusChangeAction(enabled),
        detail: pairStatusChangeDetail(enabled),
        changedAt: calculatedAt,
        operator: CURRENT_OPERATOR,
      });
      return {
        ...prev,
        lastCalculatedAt: enabled ? calculatedAt : prev.lastCalculatedAt,
        pairs: nextPairs,
        officialQuotes: enabled
          ? rebuildOpenDayQuotes(nextPairs, prev.officialQuotes, calculatedAt, [id], prev.globalBuffer)
          : prev.officialQuotes,
        changeLogs: [log, ...prev.changeLogs],
      };
    });
    return { ok: true };
  }, [snapshot.pairs]);

  const unlockedQuoteDate = useMemo(() => openQuoteDate(snapshot.pairs), [snapshot.pairs]);

  const value = useMemo<RateStoreValue>(
    () => ({
      sourceSync: snapshot.sourceSync,
      lastCalculatedAt: snapshot.lastCalculatedAt,
      globalBuffer: snapshot.globalBuffer,
      pairs,
      officialQuotes: snapshot.officialQuotes,
      changeLogs: snapshot.changeLogs,
      unlockedQuoteDate,
      dailyRows,
      syncing,
      calculating,
      syncAll,
      recalculate,
      saveGlobalBuffer,
      savePairBuffer,
      restorePairBuffer,
      addPair,
      setQuoteSource,
      setPairEnabled,
    }),
    [
      snapshot.sourceSync,
      snapshot.lastCalculatedAt,
      snapshot.globalBuffer,
      snapshot.officialQuotes,
      snapshot.changeLogs,
      unlockedQuoteDate,
      pairs,
      dailyRows,
      syncing,
      calculating,
      syncAll,
      recalculate,
      saveGlobalBuffer,
      savePairBuffer,
      restorePairBuffer,
      addPair,
      setQuoteSource,
      setPairEnabled,
    ],
  );

  return <RateStoreContext.Provider value={value}>{children}</RateStoreContext.Provider>;
}

function patchFeedAfterSync(
  pair: FxPairState,
  source: RateSource,
  work: RateSource[],
  outcome: Record<RateSource, '正常' | '失败'>,
  syncedAt: string,
  rangeDays: string[],
): SourceFeed {
  const feed = pair.feeds[source];
  if (!pair.enabled || !work.includes(source) || !feed.connected) return feed;
  if (outcome[source] === '失败') {
    return { ...feed, lastSyncAt: syncedAt, syncStatus: '失败' };
  }
  return applySuccessfulSync(feed, syncedAt, rangeDays);
}

export function useRateStore() {
  const ctx = useContext(RateStoreContext);
  if (!ctx) {
    throw new Error('useRateStore 必须在 RateProvider 内使用');
  }
  return ctx;
}
