export type SyncStatus = '正常' | '同步中' | '失败';

export interface DailyBar {
  date: string;
  open: string;
  high: string;
  low: string;
  close: string;
}

export interface FxPairState {
  id: string;
  currency1: string;
  currency2: string;
  pair: string;
  pairLabel: string;
  reutersCode: string;
  latestMarketRate: string;
  previousMarketRate: string;
  dataDate: string;
  lastSyncAt: string;
  syncStatus: SyncStatus;
  history: DailyBar[];
  volatilityBuffer: string;
  fee: string;
}

export interface ComputedQuotes {
  avg7: string;
  combinedBuffer: string;
  quoteCcy1: string;
  quoteCcy2: string;
  hasVolatilityWarning: boolean;
}

export interface EnrichedPair extends FxPairState, ComputedQuotes {
  updateDate: string;
}

export interface RateDailyRow {
  id: string;
  pairId: string;
  pair: string;
  pairLabel: string;
  reutersCode: string;
  dataDate: string;
  open: string;
  high: string;
  low: string;
  close: string;
  latestMarketRate: string;
  lastSyncAt: string;
  syncStatus: SyncStatus;
  hasVolatilityWarning: boolean;
  history: DailyBar[];
}

export interface BufferConfig {
  volatilityBuffer: string;
  fee: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface AppSnapshot {
  lastSyncAt: string;
  lastSyncStatus: SyncStatus;
  lastSyncRange?: DateRange;
  lastCalculatedAt: string;
  globalBuffer: BufferConfig;
  pairs: FxPairState[];
}
